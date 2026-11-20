# AI 陪玩接入

## 数据链路

1. Mac Electron 的 preload 只暴露语音的 start、stop 和事件订阅；独立 Swift 辅助程序使用 Speech 和 AVFoundation，用户手动开启后才录音。
2. 辅助程序推送识别文字和声音活动。客户端检测最后一次声音活动后静音默认 1000ms，自动提交一次对话，可配置为 800、1000、1500 或 2000ms。文字更新后至少等待 150ms 稳定，持续声音活动会重置静音计时。声音能量阈值需要结合实际麦克风和噪声调整。
3. 明确的单步方向移动、发射、停止指令直接在本地执行，不请求模型；否定、疑问和复合指令交给模型。其他对话调用 `POST /api/companion/chat`，随请求附带最新地图状态，无需额外等待状态上传。请求不包含 API Key。
4. Go 后端使用保存在进程内存中的配置调用兼容 Chat Completions 的服务。最近最多 4 轮历史加本轮输入，游戏状态包含进度、角色位置、地图人物及对手坐标、当前场景文字和可用按钮。
5. 模型返回文字或工具调用。工具动作进入该页面会话的队列，经 SSE 即时推送（断线时回退 300ms 轮询），客户端去重执行后通过 result 接口回传实际结果。后端把工具结果发回模型，形成完整工具循环。
6. 模型流式文字通过 NDJSON 实时转发到页面，按完整句子依次朗读，长句自动分段，不等待整段生成完。回复展示在当前角色附近，由系统中文声音朗读。没有独立 AI 化身；AI 操作的是当前选中的玩家角色。

本版不是自动截屏操纵电脑。工具只作用于游戏内的固定控制入口，不允许任意 JavaScript、文件操作或系统命令。不支持的动作会返回错误，模型不得声称完成。

## 配置与接口

配置入口为顶部「AI 陪玩配置」，填写 API 地址、模型 ID、API Key。服务需要支持 `tools` / `tool_calls`。模型服务原生 Claude Messages、Responses 或其它协议不能直接填入，需要兼容 Chat Completions 的网关。地址只接受 HTTPS 或本机 HTTP，不跟随重定向。

- `GET /api/companion/config`：只返回地址、模型名、是否已配置 Key。
- `POST /api/companion/config`：设置内存配置。`{"clear":true}` 清除。空 Key 保留同一地址原有 Key；更换地址需提供新 Key 或先清除配置。
- `POST /api/companion/state`：`{session,state}`，更新本页面状态。
- `POST /api/companion/chat`：`{session,history:[{role,content}],state?,stream?}`。默认返回 `{reply,actions}`；`stream:true` 时返回 NDJSON 事件 `round`、`delta`、`done` 或 `error`。同一会话只允许一轮请求在途。
- `GET /api/companion/events?session=…`：推送 `ready` 和 `action` SSE 事件。重连可能重投待确认动作，客户端按动作 ID 去重。独立状态心跳间隔 1.5 秒。
- `GET /api/companion/actions?session=…`：页面领取待执行动作。
- `POST /api/companion/result`：`{session,id,result:{ok,data,error}}`，确认真实执行结果。

每个动作绑定当前场景及取消代数，切换关卡、停止本轮或关闭陪玩后旧动作不再执行。移动时长 100～2000ms，单次最多 6 个工具调用；动作 8 秒内未确认会超时，整轮请求有上限。失败会显示可重试错误，不自动重发用户消息。兼容接口忽略流式并返回 JSON 时可直接处理；显式拒绝流式请求（400/422）时尝试一次非流式回退，成功后在本次配置下记住该能力，后续不再重复探测。已收到部分内容后断流不重试，也不执行未完整生成的工具。模型输出上限为 300 token，工具调用需完整组装并通过校验后才执行。

配置内存随进程退出清除；不写 localStorage、SQLite 或日志。会话标识为随机 UUID。接口验证本机 Host、Origin 和跨站请求来源，没有跨域开放。不要将本机服务反向代理到公网。

## MCP

配置界面显示的完整地址形如：

```text
http://127.0.0.1:端口/mcp?session=页面会话UUID
```

这是 stateless Streamable HTTP MCP 接口，支持协议版本 `2025-06-18`，JSON 响应、初始化、通知、ping、tools/list 和 tools/call。GET 返回 405（不提供独立 SSE 订阅）。调用需使用 `Content-Type: application/json`，建议同时设置 `Accept: application/json, text/event-stream`。

工具列表：

| 名称 | 参数 | 作用 |
| --- | --- | --- |
| `get_game_state` | `{}` | 当前进度、位置、场景文字与可用按钮 |
| `move_character` | `{direction:"left/right/up/down",duration_ms:100..2000}` | 当前地图移动 |
| `fire` | `{}` | 射击场景发射光球 |
| `interact` | `{label:"精确按钮文字"}` | 点击最新状态里的唯一可用按钮 |

页面必须保持连接且开启陪玩。MCP 客户端和内置模型共用动作校验与执行队列；当前正在执行动作时，新的动作返回忙碌错误。读取状态不受此限制。

后续可以扩展跳远蓄力、拖拽、梳头轨迹、独立队友等专用工具，避免让模型猜测屏幕坐标。

## 验证

```sh
make test build
npm run test:companion
```

Go 测试覆盖配置不回传 Key、跨站拒绝、更换地址不沿用 Key、工具真实结果回传模型、并发拒绝、非法动作、取消队列、过期状态及 MCP 初始化/工具发现。

前端单测覆盖回合互斥、失败后释放锁、旧场景动作拒绝和移动取消。Electron 联调使用本地假模型和模拟语音事件，验证默认一秒静音、本地指令零模型请求、首句在上游生成结束前开始朗读、重复提交锁、实际移动、朗读回合、角色气泡、MCP 操作和停止取消。

自动化没有录制真人声音，也没有调用真实付费模型。首次 TCC 授权、真实儿童语音识别、端到端延迟和具体服务商兼容性，需要用实际设备与配置检查。界面的耗时统计从提交开始计时，不包含等待静音；本地指令显示执行完成时间，模型显示首段文字时间。

2026-11-19 本地 Electron 模拟语音测试，从最后一次模拟声音活动到角色首次移动约 1084ms，包含默认 1000ms 静音等待。该数值只证明本地链路，没有包含真实 ASR 或付费模型延迟。

## 参考

- [MCP 工具协议](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
- [Apple Speech](https://developer.apple.com/documentation/speech)
- [设备端识别能力](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition)
