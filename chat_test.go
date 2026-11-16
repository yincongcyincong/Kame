package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type chatTransport func(*http.Request) (*http.Response, error)

func (transport chatTransport) RoundTrip(request *http.Request) (*http.Response, error) {
	return transport(request)
}

func TestCompletionURL(t *testing.T) {
	cases := map[string]string{
		"https://api.example.test":                         "https://api.example.test/v1/chat/completions",
		"https://api.example.test/proxy/v1/":               "https://api.example.test/proxy/v1/chat/completions",
		"https://api.example.test/v1/chat/completions?a=1": "https://api.example.test/v1/chat/completions?a=1",
		"http://127.0.0.1:11434/v1":                        "http://127.0.0.1:11434/v1/chat/completions",
	}
	for raw, expected := range cases {
		actual, err := completionURL(raw)
		if err != nil || actual.String() != expected {
			t.Errorf("completionURL(%q) = %v, %v", raw, actual, err)
		}
	}
	for _, invalid := range []string{"file:///etc/passwd", "http://api.example.test/v1", "https://user:pass@api.example.test"} {
		if _, err := completionURL(invalid); err == nil {
			t.Errorf("unexpectedly accepted %q", invalid)
		}
	}
}

func TestChatSendsTutorPromptAndProgress(t *testing.T) {
	handler := chatHandler(&http.Client{Transport: chatTransport(func(r *http.Request) (*http.Response, error) {
		if r.URL.Path != "/v1/chat/completions" || r.Header.Get("Authorization") != "Bearer fake-key" {
			t.Fatal("model address or Authorization header not forwarded")
		}
		var payload struct {
			Model    string
			Messages []chatMessage
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatal(err)
		}
		if payload.Model != "demo" || len(payload.Messages) != 2 ||
			payload.Messages[0].Role != "system" ||
			!strings.Contains(payload.Messages[0].Content, `"当前游戏":"分数披萨店"`) ||
			!strings.Contains(payload.Messages[0].Content, `"当前关历史星数":0`) ||
			!strings.Contains(payload.Messages[0].Content, `"当前站":2`) ||
			strings.Contains(payload.Messages[0].Content, "fake-key") ||
			payload.Messages[1].Content != "给我一点提示" {
			t.Fatalf("unexpected model payload: %+v", payload)
		}
		return &http.Response{StatusCode: 200,
			Body: io.NopCloser(strings.NewReader(`{"choices":[{"message":{"role":"assistant","content":"先看要平分成几份。"}}]}`))}, nil
	})})
	request := httptest.NewRequest(http.MethodPost, "http://127.0.0.1:8080/api/chat", strings.NewReader(`{
		"url":"https://api.example.test/v1","model":"demo","key":"fake-key",
		"history":[{"role":"user","content":"给我一点提示"}],
		"progress":{"年级":5,"当前游戏":"分数披萨店","当前站":2,"当前关历史星数":0}
	}`))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), "先看要平分成几份") {
		t.Fatalf("chat returned %d: %s", response.Code, response.Body)
	}
}

func TestChatRejectsOtherBrowserOrigins(t *testing.T) {
	handler := chatHandler(&http.Client{Transport: chatTransport(func(*http.Request) (*http.Response, error) {
		t.Fatal("unexpected model request")
		return nil, nil
	})})
	for _, host := range []string{"127.0.0.1:8080", "example.test:8080"} {
		request := httptest.NewRequest(http.MethodPost, "http://"+host+"/api/chat", strings.NewReader("{}"))
		request.Header.Set("Content-Type", "application/json")
		request.Header.Set("Origin", "http://other.example.test")
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != http.StatusForbidden {
			t.Fatalf("cross-origin request returned %d", response.Code)
		}
	}
}
