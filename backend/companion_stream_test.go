package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestCompanionStreamsBeforeGenerationFinishes(t *testing.T) {
	reader, writer := io.Pipe()
	defer reader.Close()
	first := make(chan string, 1)
	release := make(chan struct{})
	done := make(chan error, 1)
	go func() {
		_, err := readCompanionStream(reader, func(text string) error { first <- text; return nil })
		done <- err
	}()
	go func() {
		defer writer.Close()
		io.WriteString(writer, "data: {\"choices\":[{\"delta\":{\"content\":\"我们一起找线索。\"}}]}\n\n")
		<-release
		io.WriteString(writer, "data: {\"choices\":[{\"delta\":{},\"finish_reason\":\"stop\"}]}\n\ndata: [DONE]\n\n")
	}()
	select {
	case text := <-first:
		if text != "我们一起找线索。" {
			t.Fatal(text)
		}
	case <-time.After(time.Second):
		close(release)
		t.Fatal("first sentence buffered until generation finished")
	}
	close(release)
	if err := <-done; err != nil {
		t.Fatal(err)
	}
}

func TestCompanionStreamAssemblesToolsAndRejectsTruncation(t *testing.T) {
	chunks := []string{
		`{"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-1","type":"function","function":{"name":"move_character","arguments":"{\"direction\":\"le"}}]}}]}`,
		`{"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"ft\",\"duration_ms\":450}"}}]},"finish_reason":"tool_calls"}]}`,
	}
	text := "data: " + strings.Join(chunks, "\n\ndata: ") + "\n\ndata: [DONE]\n\n"
	out, err := readCompanionStream(strings.NewReader(text), nil)
	if err != nil || len(out.Calls) != 1 {
		t.Fatalf("%+v %v", out, err)
	}
	if out.Calls[0].Function.Arguments != `{"direction":"left","duration_ms":450}` {
		t.Fatal(out.Calls)
	}
	if validateGameAction(out.Calls[0].Function.Name, json.RawMessage(out.Calls[0].Function.Arguments)) != nil {
		t.Fatal("bad tool assembly")
	}
	for _, bad := range []string{"data: " + chunks[0] + "\n\n", `data: {"choices":[{"delta":{},"finish_reason":"length"}]}` + "\n\n"} {
		if _, err := readCompanionStream(strings.NewReader(bad), nil); err == nil {
			t.Fatal("partial tool stream accepted")
		}
	}
}

func TestCompanionStreamRejectedRequestFallsBackWithoutReplayingPartial(t *testing.T) {
	s, _ := companionTestService()
	calls := 0
	s.client = &http.Client{Transport: companionTransport(func(r *http.Request) (*http.Response, error) {
		calls++
		raw, _ := io.ReadAll(r.Body)
		var body map[string]any
		json.Unmarshal(raw, &body)
		response := &http.Response{Header: make(http.Header)}
		if calls == 1 {
			if body["stream"] != true {
				t.Error("not requesting streaming")
			}
			response.StatusCode = 422
			response.Body = io.NopCloser(strings.NewReader(`{}`))
		} else {
			if body["stream"] != false {
				t.Error("fallback not disabled")
			}
			response.StatusCode = 200
			response.Body = io.NopCloser(strings.NewReader(`{"choices":[{"message":{"content":"你好。"}}]}`))
		}
		return response, nil
	})}
	var text string
	_, err := s.complete(context.Background(), modelSettings{URL: "https://example.test/v1", Model: "model"}, nil, true, func(delta string) error { text += delta; return nil })
	if err != nil || calls != 2 || text != "你好。" {
		t.Fatalf("calls=%d text=%q err=%v", calls, text, err)
	}
	_, err = s.complete(context.Background(), modelSettings{URL: "https://example.test/v1", Model: "model"}, nil, true, func(string) error { return nil })
	if err != nil || calls != 3 {
		t.Fatal("non-streaming provider was probed again", calls, err)
	}
	calls = 0
	s.streamRejected = make(map[string]bool)
	s.client.Transport = companionTransport(func(r *http.Request) (*http.Response, error) {
		calls++
		return &http.Response{StatusCode: 200, Header: http.Header{"Content-Type": []string{"text/event-stream"}}, Body: io.NopCloser(strings.NewReader("data: {\"choices\":[{\"delta\":{\"content\":\"半句话\"}}]}\n\n"))}, nil
	})
	_, err = s.complete(context.Background(), modelSettings{URL: "https://example.test/v1", Model: "model"}, nil, true, func(string) error { return nil })
	if err == nil || calls != 1 {
		t.Fatal("partial response must not be replayed", calls, err)
	}
}

type companionEventRecorder struct {
	header http.Header
	events chan string
}

func (r *companionEventRecorder) Header() http.Header { return r.header }
func (r *companionEventRecorder) WriteHeader(int)     {}
func (r *companionEventRecorder) Write(body []byte) (int, error) {
	r.events <- string(body)
	return len(body), nil
}
func (r *companionEventRecorder) Flush() {}
func TestCompanionActionPushAndCancel(t *testing.T) {
	s, mux := companionTestService()
	publishCompanionState(t, mux)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	request := httptest.NewRequest("GET", "http://localhost/api/companion/events?session="+testSession, nil).WithContext(ctx)
	recorder := &companionEventRecorder{header: make(http.Header), events: make(chan string, 8)}
	ended := make(chan struct{})
	go func() { mux.ServeHTTP(recorder, request); close(ended) }()
	select {
	case ready := <-recorder.events:
		if !strings.Contains(ready, "event: ready") {
			t.Fatal(ready)
		}
	case <-time.After(time.Second):
		t.Fatal("no SSE connection")
	}
	actionDone := make(chan actionResult, 1)
	go func() { actionDone <- s.call(ctx, testSession, "fire", json.RawMessage(`{}`)) }()
	select {
	case pushed := <-recorder.events:
		if !strings.Contains(pushed, `"name":"fire"`) {
			t.Fatal(pushed)
		}
	case <-time.After(time.Second):
		t.Fatal("action was not pushed without polling")
	}
	cancel()
	<-ended
	result := <-actionDone
	if result.OK || result.Error == "" {
		t.Fatal(result)
	}
}

func TestCompanionFirstChatCarriesStateWithoutPriorHeartbeat(t *testing.T) {
	s, mux := companionTestService()
	s.settings = modelSettings{URL: "https://example.test/v1", Model: "model"}
	s.client = &http.Client{Transport: companionTransport(func(r *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(`{"choices":[{"message":{"content":"我们一起玩。"}}]}`))}, nil
	})}
	response := companionTestRequest(mux, "POST", "/api/companion/chat", `{"session":"`+testSession+`","stream":true,"state":{"context_id":"new-scene"},"history":[{"role":"user","content":"你好"}]}`)
	if response.Code != 200 || !strings.Contains(response.Body.String(), `"type":"done"`) {
		t.Fatal(response.Code, response.Body.String())
	}
	if string(s.sessions[testSession].State) != `{"context_id":"new-scene"}` {
		t.Fatal("chat did not install the latest game state")
	}
}
