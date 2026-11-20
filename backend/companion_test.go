package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

type companionTransport func(*http.Request) (*http.Response, error)

func (f companionTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func companionTestRequest(handler http.Handler, method, path, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, "http://localhost"+path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	return res
}
func companionTestService() (*companionService, *http.ServeMux) {
	s := newCompanionService()
	mux := http.NewServeMux()
	s.register(mux)
	return s, mux
}

const testSession = "test-session-123456789"

func publishCompanionState(t *testing.T, mux *http.ServeMux) {
	t.Helper()
	res := companionTestRequest(mux, "POST", "/api/companion/state", `{"session":"`+testSession+`","state":{"context_id":"scene-1","progress":{"当前游戏":"光球对决"}}}`)
	if res.Code != 200 {
		t.Fatal(res.Body.String())
	}
}

func TestCompanionConfigCredentialsStayOnServer(t *testing.T) {
	_, mux := companionTestService()
	saved := companionTestRequest(mux, "POST", "/api/companion/config", `{"url":"https://model.example/v1","model":"play-model","key":"private-test-key"}`)
	if saved.Code != 200 {
		t.Fatal(saved.Body.String())
	}
	config := companionTestRequest(mux, "GET", "/api/companion/config", "")
	if strings.Contains(config.Body.String(), "private-test-key") || !strings.Contains(config.Body.String(), `"hasKey":true`) {
		t.Fatal(config.Body.String())
	}
	changed := companionTestRequest(mux, "POST", "/api/companion/config", `{"url":"https://other.example/v1","model":"play-model"}`)
	if changed.Code != 400 {
		t.Fatal("old key must not leak to a new endpoint", changed.Code)
	}
	req := httptest.NewRequest("POST", "http://localhost/api/companion/config", strings.NewReader(`{"clear":true}`))
	req.Header.Set("Origin", "https://other.example")
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)
	if res.Code != 403 {
		t.Fatal(res.Code)
	}
	companionTestRequest(mux, "POST", "/api/companion/config", `{"clear":true}`)
	if strings.Contains(companionTestRequest(mux, "GET", "/api/companion/config", "").Body.String(), `"hasKey":true`) {
		t.Fatal("clear did not remove credentials")
	}
}

func TestCompanionToolRoundTripAndSingleFlight(t *testing.T) {
	s, mux := companionTestService()
	publishCompanionState(t, mux)
	s.settings = modelSettings{URL: "https://model.example/v1", Model: "play-model", Key: "secret"}
	var calls atomic.Int32
	s.client = &http.Client{Transport: companionTransport(func(r *http.Request) (*http.Response, error) {
		if r.Header.Get("Authorization") != "Bearer secret" {
			t.Error("missing server credentials")
		}
		data, _ := io.ReadAll(r.Body)
		text := `{"choices":[{"message":{"role":"assistant","content":"我已经发射光球了。"}}]}`
		if calls.Add(1) == 1 {
			if !strings.Contains(string(data), "光球对决") || !strings.Contains(string(data), `"tools"`) {
				t.Error("missing state/tools")
			}
			text = `{"choices":[{"message":{"role":"assistant","content":null,"tool_calls":[{"id":"call-1","type":"function","function":{"name":"fire","arguments":"{}"}}]}}]}`
		} else if !strings.Contains(string(data), `"tool_call_id":"call-1"`) || !strings.Contains(string(data), "actual-state") {
			t.Error("model did not receive actual execution result")
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(text)), Header: make(http.Header)}, nil
	})}
	done := make(chan *httptest.ResponseRecorder, 1)
	body := `{"session":"` + testSession + `","history":[{"role":"user","content":"帮我发射"}]}`
	go func() { done <- companionTestRequest(mux, "POST", "/api/companion/chat", body) }()
	var actions []gameAction
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		res := companionTestRequest(mux, "GET", "/api/companion/actions?session="+testSession, "")
		json.Unmarshal(res.Body.Bytes(), &actions)
		if len(actions) > 0 {
			break
		}
		time.Sleep(time.Millisecond)
	}
	if len(actions) != 1 || actions[0].Name != "fire" || actions[0].Context != "scene-1" {
		t.Fatalf("missing game action: %+v", actions)
	}
	concurrent := companionTestRequest(mux, "POST", "/api/companion/chat", body)
	if concurrent.Code != 409 {
		t.Fatalf("concurrent turn accepted: %d", concurrent.Code)
	}
	result := `{"session":"` + testSession + `","id":"` + actions[0].ID + `","result":{"ok":true,"data":"actual-state"}}`
	companionTestRequest(mux, "POST", "/api/companion/result", result)
	select {
	case res := <-done:
		if res.Code != 200 || !strings.Contains(res.Body.String(), "发射光球") {
			t.Fatalf("%d %s", res.Code, res.Body.String())
		}
	case <-time.After(time.Second):
		t.Fatal("model round trip did not complete")
	}
	if calls.Load() != 2 {
		t.Fatal("expected exactly two model calls")
	}
}

func TestCompanionRejectsInvalidOrCancelledActions(t *testing.T) {
	s, mux := companionTestService()
	publishCompanionState(t, mux)
	for _, entry := range []struct{ Name, Args string }{{"shell", `{}`}, {"move_character", `{"direction":"left","duration_ms":9000}`}, {"fire", `{"command":"anything"}`}, {"interact", `{"label":""}`}, {"move_character", `{"direction":"up","duration_ms":100.5}`}} {
		if result := s.call(context.Background(), testSession, entry.Name, json.RawMessage(entry.Args)); result.OK || result.Error == "" {
			t.Fatal("invalid action accepted", entry)
		}
	}
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan actionResult, 1)
	go func() { done <- s.call(ctx, testSession, "fire", json.RawMessage(`{}`)) }()
	cancel()
	<-done
	if actions := companionTestRequest(mux, "GET", "/api/companion/actions?session="+testSession, "").Body.String(); strings.TrimSpace(actions) != "[]" {
		t.Fatal("cancelled action remained queued", actions)
	}
	s.mu.Lock()
	s.sessions[testSession].Updated = time.Now().Add(-time.Minute)
	s.mu.Unlock()
	if s.call(context.Background(), testSession, "get_game_state", json.RawMessage(`{}`)).OK {
		t.Fatal("stale game state accepted")
	}
}

func TestCompanionMCPInitializationAndTools(t *testing.T) {
	_, mux := companionTestService()
	publishCompanionState(t, mux)
	for _, body := range []string{`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}`, `{"jsonrpc":"2.0","id":2,"method":"tools/list"}`, `{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_game_state","arguments":{}}}`} {
		res := companionTestRequest(mux, "POST", "/mcp?session="+testSession, body)
		if res.Code != 200 || !strings.Contains(res.Body.String(), `"result"`) {
			t.Fatalf("%d %s", res.Code, res.Body.String())
		}
	}
	res := companionTestRequest(mux, "POST", "/mcp", `{"jsonrpc":"2.0","method":"notifications/initialized"}`)
	if res.Code != 202 {
		t.Fatal(res.Code)
	}
	res = companionTestRequest(mux, "POST", "/mcp?session="+testSession, `{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"delete_files","arguments":{}}}`)
	if !strings.Contains(res.Body.String(), `"isError":true`) {
		t.Fatal(res.Body.String())
	}
}
