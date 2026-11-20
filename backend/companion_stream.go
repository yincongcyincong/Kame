package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"io"
	"strings"
)

// Read a complete Chat Completions SSE message. Tool arguments may span many deltas;
// no tool is executed until the upstream turn has finished successfully.
func readCompanionStream(reader io.Reader, emit func(string) error) (companionMessage, error) {
	out := companionMessage{Role: "assistant"}
	scanner := bufio.NewScanner(io.LimitReader(reader, 512*1024))
	scanner.Buffer(make([]byte, 4096), 128*1024)
	calls := make(map[int]*companionCall)
	finished := false
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "[DONE]" {
			finished = true
			break
		}
		var chunk struct {
			Error   json.RawMessage `json:"error"`
			Choices []struct {
				Index  int     `json:"index"`
				Finish *string `json:"finish_reason"`
				Delta  struct {
					Content string `json:"content"`
					Calls   []struct {
						Index    int    `json:"index"`
						ID       string `json:"id"`
						Type     string `json:"type"`
						Function struct {
							Name      string `json:"name"`
							Arguments string `json:"arguments"`
						} `json:"function"`
					} `json:"tool_calls"`
				} `json:"delta"`
			} `json:"choices"`
		}
		if json.Unmarshal([]byte(data), &chunk) != nil || (len(chunk.Error) > 0 && string(chunk.Error) != "null") {
			return out, errors.New("模型流式回复格式错误或中断")
		}
		for _, choice := range chunk.Choices {
			if choice.Index != 0 {
				continue
			}
			if choice.Finish != nil {
				if *choice.Finish != "stop" && *choice.Finish != "tool_calls" {
					return out, errors.New("模型回复未完整生成，请缩短请求后重试")
				}
				finished = true
			}
			text := choice.Delta.Content
			if text != "" {
				out.Content += text
				if len([]rune(out.Content)) > 1500 {
					return out, errors.New("模型回复过长，请重试")
				}
				if emit != nil {
					if err := emit(text); err != nil {
						return out, err
					}
				}
			}
			for _, delta := range choice.Delta.Calls {
				if delta.Index < 0 || delta.Index >= 8 {
					return out, errors.New("模型一次请求了过多工具")
				}
				call := calls[delta.Index]
				if call == nil {
					call = &companionCall{Type: "function"}
					calls[delta.Index] = call
				}
				call.ID += delta.ID
				call.Function.Name += delta.Function.Name
				call.Function.Arguments += delta.Function.Arguments
				if len(call.ID) > 200 || len(call.Function.Name) > 100 || len(call.Function.Arguments) > 4096 {
					return out, errors.New("模型工具参数过长")
				}
			}
		}
	}
	if scanner.Err() != nil || !finished {
		return out, errors.New("模型连接中断，已停止本轮，请重试")
	}
	for i := 0; i < len(calls); i++ {
		call := calls[i]
		if call == nil {
			return out, errors.New("模型工具序号不连续")
		}
		out.Calls = append(out.Calls, *call)
	}
	return out, nil
}
