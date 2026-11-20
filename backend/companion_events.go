package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Push actions immediately. The normal JSON actions endpoint remains as a fallback.
func (s *companionService) events(w http.ResponseWriter, r *http.Request) {
	if !localCompanionRequest(w, r) {
		return
	}
	s.mu.Lock()
	session := s.sessions[r.URL.Query().Get("session")]
	s.mu.Unlock()
	if session == nil {
		http.Error(w, "游戏未连接", 404)
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "不支持流式传输", 500)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("X-Accel-Buffering", "no")
	fmt.Fprint(w, "retry: 800\nevent: ready\ndata: {}\n\n")
	flusher.Flush()
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	send := func() bool {
		s.mu.Lock()
		actions := append([]*gameAction(nil), session.Actions...)
		s.mu.Unlock()
		for _, action := range actions {
			if time.Since(action.Issued) >= 8*time.Second {
				continue
			}
			data, _ := json.Marshal(action)
			if _, err := fmt.Fprintf(w, "event: action\ndata: %s\n\n", data); err != nil {
				return false
			}
		}
		flusher.Flush()
		return true
	}
	if !send() {
		return
	}
	for {
		select {
		case <-r.Context().Done():
			return
		case <-session.Wake:
			if !send() {
				return
			}
		case <-ticker.C:
			if _, err := fmt.Fprint(w, ": heartbeat\n\n"); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}
