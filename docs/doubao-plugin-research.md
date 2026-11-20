# 与豆包一起玩游戏的插件接入调研

调研日期为 2026 年 11 月 19 日。本文是接入方案，插件尚未创建、发布或完成豆包真机验证。

## 当前页面

游戏页面已移除模型设置、API Key 输入、AI 聊天、系统听写聊天和 AI 自定义任务入口。后端也撤下了原有聊天、任务生成和家长解锁路由。29 个预置游戏及其本地题库、存档继续使用。

## 官方接入渠道

豆包已有应用插件机制，开发者提供 MCP 服务与 Skill，可以配合对话卡片和全页。当前采用邀请制，需要通过对接人获取邀请码。发布需经过平台审核。因此，初始化工程前要先取得账号与应用接入资格。参考[官方介绍](https://open.doubao.com/apps-plugin/docs/overview/introduction)。

扣子的低代码智能体发布至豆包渠道入口已于 2026 年 7 月 1 日下线，存量已发布智能体不受影响。新游戏应按豆包应用插件流程评估。参考[扣子更新动态](https://docs.coze.cn/recent-updates)。

## 如何生成工程

在取得资格后，按官方快速开始安装 CLI，并在独立目录初始化。CLI 需要登录并获取沙箱应用身份。以下命令仅作操作指引，本次没有执行登录或修改全局环境。

```sh
npm install -g @doubao-dev/cli
dbx init starry-playmate
cd starry-playmate
dbx dev
```

需使用 Node.js 22.13.1 或更高版本和已完成主体认证的开发者账号。生成的工程含 manifest.yaml、skill、页面等目录，后续接入我们自己的业务服务。参考[官方快速开始](https://open.doubao.com/apps-plugin/docs/overview/quick-start)。

## 游戏如何接入

建议从节奏乐队试点。孩子说“豆包，你敲一段，我来接”，豆包提供一小段节奏。页面负责真实计时和判分。孩子也能自己敲一段，再让豆包接。这样模型负责伙伴的回合，孩子始终控制自己的操作。

建议的业务能力如下，这些名称是本项目拟定的接口，仍需开发。

| 能力 | 输入和结果 |
| --- | --- |
| list_games | 返回可玩的游戏与玩法 |
| start_session | 创建一局游戏，记录用户角色、豆包角色和年级 |
| get_game_state | 返回当前步骤、道具、上一操作、允许的伙伴动作 |
| act_as_partner | 执行示范节奏、接物、等待、说话等允许动作 |
| finish_turn | 核对真实操作结果，推进回合并返回最新状态 |

客户端工具与页面有各自的运行上下文，工具无法直接访问页面 React state。模型动作需要通过正式的状态同步和事件渠道送给游戏，再由本地逻辑核对、执行。参考[端工具开发](https://open.doubao.com/apps-plugin/docs/frontend-development/client-tools)。

Agent Event 可以通知已挂载页面更新状态。事件应带 sessionId、动作 ID 和状态版本，页面负责过滤其他对局的事件并消除重复动作。重开页面时从服务恢复状态。工具返回与页面事件分别验证。参考[Agent 与端侧交互](https://open.doubao.com/apps-plugin/docs/client-framework/agent-interaction.md)。

## 现有代码能复用多少

题库、动作判定、游戏数据等纯 JavaScript 模块适合复用。现有 React DOM 页面和 CSS 需要做端适配。官方全页示例使用 view、text、scroll-view 等节点，不能把当前 Electron 窗口直接作为插件交付。连续移动、键盘、音频、触摸和动画需在目标宿主逐项验证。参考[全页开发](https://open.doubao.com/apps-plugin/docs/frontend-development/full-page)。

需要与平台确认工作模式目标端是否开放所需的全页、音频与事件能力。得到确认后，用生成的真实工程和 SDK 逐步实现，先跑通一款双人回合游戏，再扩展其他玩法。

## 交付顺序

1. 取得开发者接入资格，确认工作模式及目标终端支持范围。
2. 初始化官方插件工程，验证页面和工具调用。
3. 为节奏乐队实现 session 状态、伙伴动作和页面事件。
4. 测试孩子操作、豆包回应、重复事件、断线恢复和页面重开。
5. 按平台要求提交审核，再开展真实用户联调。

截至本次调研，邀请码、AppID、插件工程、部署服务及审核均尚未完成。
