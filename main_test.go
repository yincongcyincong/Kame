package main

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
)

func TestProgressKeepsBestScoreAfterReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "learning.db")
	open := func() *sql.DB {
		db, err := sql.Open("sqlite3", path)
		if err != nil {
			t.Fatal(err)
		}
		return db
	}
	db := open()
	if _, err := db.Exec("CREATE TABLE progress (game TEXT PRIMARY KEY, stars INTEGER NOT NULL)"); err != nil {
		t.Fatal(err)
	}
	handler := routes(db, t.TempDir())
	for _, body := range []string{`{"game":"pinyin","stars":3}`, `{"game":"pinyin","stars":1}`, `{"game":"g2-sound","stars":0}`} {
		request := httptest.NewRequest(http.MethodPost, "/api/progress", strings.NewReader(body))
		request.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != http.StatusNoContent {
			t.Fatalf("POST returned %d: %s", response.Code, response.Body)
		}
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	db = open()
	defer db.Close()
	response := httptest.NewRecorder()
	routes(db, t.TempDir()).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/progress", nil))
	if response.Code != http.StatusOK || strings.TrimSpace(response.Body.String()) != `{"g2-sound":0,"pinyin":3}` {
		t.Fatalf("GET returned %d: %s", response.Code, response.Body)
	}
}
