package main

import (
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	dbPath := flag.String("db", "learning.db", "SQLite database path")
	address := flag.String("listen", "127.0.0.1:8080", "HTTP listen address")
	assets := flag.String("assets", "dist", "frontend directory")
	flag.Parse()
	if err := os.MkdirAll(filepath.Dir(*dbPath), 0700); err != nil {
		log.Fatal(err)
	}
	db, err := sql.Open("sqlite3", *dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	if _, err := db.Exec("CREATE TABLE IF NOT EXISTS progress (game TEXT PRIMARY KEY, stars INTEGER NOT NULL)"); err != nil {
		log.Fatal(err)
	}

	listener, err := net.Listen("tcp", *address)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("http://%s\n", listener.Addr())
	log.Fatal(http.Serve(listener, routes(db, *assets)))
}

func routes(db *sql.DB, assets string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/parent/unlock", unlockParentSettings)
	mux.HandleFunc("POST /api/chat", newChatHandler())
	mux.HandleFunc("POST /api/missions", missionHandler(newModelClient()))
	mux.Handle("GET /", http.FileServer(http.Dir(assets)))
	mux.HandleFunc("GET /api/progress", func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.QueryContext(r.Context(), "SELECT game, stars FROM progress")
		if err != nil {
			http.Error(w, "读取进度失败", 500)
			return
		}
		defer rows.Close()
		progress := map[string]int{}
		for rows.Next() {
			var game string
			var stars int
			if err := rows.Scan(&game, &stars); err != nil {
				http.Error(w, "读取进度失败", 500)
				return
			}
			progress[game] = stars
		}
		if rows.Err() != nil {
			http.Error(w, "读取进度失败", 500)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(progress)
	})
	mux.HandleFunc("POST /api/progress", func(w http.ResponseWriter, r *http.Request) {
		var result struct {
			Game  string
			Stars int
		}
		r.Body = http.MaxBytesReader(w, r.Body, 1024)
		if r.Header.Get("Content-Type") != "application/json" || json.NewDecoder(r.Body).Decode(&result) != nil || len(result.Game) == 0 || len(result.Game) > 32 || result.Stars < 0 || result.Stars > 3 {
			http.Error(w, "无效的闯关记录", 400)
			return
		}
		_, err := db.ExecContext(r.Context(), "INSERT INTO progress VALUES (?, ?) ON CONFLICT(game) DO UPDATE SET stars = MAX(progress.stars, excluded.stars)", result.Game, result.Stars)
		if err != nil {
			http.Error(w, "保存进度失败", 500)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	return mux
}
