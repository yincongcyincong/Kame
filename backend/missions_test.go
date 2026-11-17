package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const playableMission = `{"title":"云朵书店","intro":"给小熊送书。",
"stages":[
{"kind":"pack","prompt":"收集两本书。","hint":"数一数。","tiles":["书","笔","书"],"answer":["书","书"]},
{"kind":"sequence","prompt":"先到学校，再去公园。","hint":"从学校出发。","tiles":["公园","机场","学校"],"answer":["学校","公园"],"before":[["学校","公园"]]},
{"kind":"pack","prompt":"装一个水壶和一张卡。","hint":"每种各一。","tiles":["卡","帽子","水壶"],"answer":["水壶","卡"]}
]}`

func TestMissionValidation(t *testing.T) {
	var job mission
	if err := json.Unmarshal([]byte(playableMission), &job); err != nil || !validMission(job) {
		t.Fatalf("expected playable example: %v", err)
	}
	job.Stages[0].Answer = []string{"笔", "笔"}
	if validMission(job) {
		t.Fatal("accepted a task with more items needed than supplied")
	}
	job.Stages[0].Answer = []string{"书", "书"}
	job.Stages[1].Tiles = []string{"公园", "学校", "学校"}
	if validMission(job) {
		t.Fatal("accepted ambiguous sequencing tiles")
	}
	job.Stages[1].Tiles = []string{"公园", "学校", "机场"}
	job.Stages[2].Hint = "访问 https://example.test"
	if validMission(job) {
		t.Fatal("accepted an external URL in a task")
	}
}

func TestMissionGeneration(t *testing.T) {
	handler := missionHandler(&http.Client{Transport: chatTransport(func(req *http.Request) (*http.Response, error) {
		var payload struct {
			Messages []chatMessage
		}
		if err := json.NewDecoder(req.Body).Decode(&payload); err != nil {
			t.Fatal(err)
		}
		if strings.Contains(payload.Messages[0].Content, "审核下一条消息") {
			return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(`{"choices":[{"message":{"content":"ALLOW"}}]}`))}, nil
		}
		if len(payload.Messages) != 2 || payload.Messages[0].Role != "system" ||
			!strings.Contains(payload.Messages[1].Content, `"点子":"帮小熊送书"`) ||
			!strings.Contains(payload.Messages[1].Content, `"角色":"彩虹"`) ||
			!strings.Contains(payload.Messages[1].Content, `"动画":"宇宙护卫队"`) {
			t.Fatalf("unexpected model payload: %+v", payload)
		}
		body, _ := json.Marshal(map[string]any{
			"choices": []map[string]any{{"message": chatMessage{Content: "```json\n" + playableMission + "\n```"}}},
		})
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(string(body)))}, nil
	})})
	request := httptest.NewRequest(http.MethodPost, "http://127.0.0.1/api/missions", strings.NewReader(
		`{"url":"https://example.test/v1","model":"test","role":"rainbow","idea":"帮小熊送书"}`))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), "云朵书店") {
		t.Fatalf("generation returned %d: %s", response.Code, response.Body)
	}
}

func TestSequenceMustHaveUniqueSolution(t *testing.T) {
	stage := missionStage{Answer: []string{"A", "B", "C"}, Before: [][]string{{"A", "B"}}}
	if uniqueSequence(stage) {
		t.Fatal("accepted multiple orders")
	}
	stage.Before = append(stage.Before, []string{"B", "C"})
	if !uniqueSequence(stage) {
		t.Fatal("rejected unique order")
	}
	stage.Before = append(stage.Before, []string{"C", "A"})
	if uniqueSequence(stage) {
		t.Fatal("accepted a cycle")
	}
}
