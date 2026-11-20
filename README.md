# 星星学园

星星学园是以动画角色互动为主的桌面应用。打开即可选择《超级飞侠》《宇宙护卫队》《拉布拉多警长》或《宝贝JOJO》。

完成预设任务会获得三枚徽章，进度保存在 SQLite。以前分开记录的同一个动画任务会合并显示为一个完成记录。

## 运行

需要 Make、Node.js、Go 1.23 或以上，以及支持 CGO 的 C 编译器（macOS 可用 Xcode Command Line Tools）。

```sh
make
```

首次运行会联网安装依赖，然后构建 React 和 Go，并启动 Electron。可用 `make build` 只构建，或用 `make frontend`、`make backend` 单独构建。执行 `make test` 可检查题库、本地存档及 AI 陪玩逻辑。构建后执行 `npm run test:companion`，可用本地模拟模型验证 Electron 陪玩链路。

Electron 会启动仅监听本机回环地址的 Go 服务。SQLite 存放在 Electron 用户数据目录。浏览器预览可运行 `npm run preview`，再打开服务打印的本地地址。浏览器预览默认在项目目录使用 `learning.db`。

## AI 语音陪玩

点击顶部「AI 陪玩配置」，填写 API 地址、模型名和 API Key，保存后点击「开启陪玩」。接口须兼容 Chat Completions，并支持 `tools` / `tool_calls`；可填写服务根地址、`/v1` 地址或完整 `/chat/completions` 地址。原生 Claude Messages 接口需要通过兼容网关接入。

Mac 客户端点击「开始语音」后，会请求系统麦克风和语音识别授权。讲话停顿默认 1 秒后自动提交，可在配置里选 0.8、1、1.5 或 2 秒。明确的单步移动、发射和停止指令在本地执行；其他对话将识别文字及当前游戏状态交给 Go 后端，调用配置的模型。请求、动作执行和朗读期间不会重复发送，朗读完恢复监听；场景人物朗读时也会暂停收音，避免回声。模型回复支持流式显示和分句朗读，首句完整后即可开始读，不必等整段结束；可以选择本机中文朗读声音、调整语速，也可以打字陪玩。动作由 SSE 即时推送，断线时自动重连并回退轮询。控制区显示从提交到本地执行完成或模型首段文字的耗时。

Mac 语音由 Swift 辅助程序调用 Apple Speech 框架，优先设备端识别；设备或语言不支持时使用 Apple 在线识别。`make build` 会编译并本地签名辅助程序，需要 Xcode Command Line Tools。首次授权或真实麦克风效果需要在自己的 Mac 上检查；自动测试使用模拟语音事件。网页预览支持打字和系统听写输入，自动语音仅在 Mac Electron 客户端提供。

API Key 只留在本次 Go 后端进程的内存中，浏览器不存储、配置读取接口不返回 Key；退出后需重新配置。识别文字、最近对话和游戏状态会发给配置的 API 地址。更换地址时必须重新填写 Key 或先清除配置。

非流式服务会自动兼容；只有请求被明确拒绝时才尝试非流式重试，已输出内容后断流不会自动重发。

AI 能读取进度、移动当前玩家角色、向对手发射光球、点击当前场景中可用的按钮，并根据实际执行结果继续回复。AI 不会默认接管游戏或自动替孩子答题。当前还不支持拖拽、梳头轨迹、按住蓄力等连续手势，也没有新增独立的 AI 队友角色。

后端同时提供本地 Streamable HTTP MCP 接口。展开配置中的「本地 MCP 连接地址」，复制包含当前会话的 URL；保持游戏窗口开启并开启陪玩，即可从 MCP 客户端调用相同工具。该接口仅在本机使用，内置模型通过工具调用适配器使用同一个动作执行器。详细协议与扩展说明见 [AI 陪玩接入](docs/ai-companion.md)。

## 动画角色任务

目前有 **29 个预置游戏**，分布在 4 部动画中。预置游戏可离线游玩，完成进度存入 SQLite。

| 动画 | 预置游戏数 | 玩法 |
| --- | ---: | --- |
| 超级飞侠 | 5 | 世界机场光球对决、开飞机送快递、听声送包裹、乐迪接包裹、双机接力 |
| 宇宙护卫队 | 6 | 救援基地光球对决、开救援车搭桥、照亮山洞、护卫队跳远赛、接住能量晶石、管道抢修 |
| 拉布拉多警长 | 7 | 3 个 2D 走访推理案件、案发现场回放、听音寻踪、接住证物袋、脚印追踪 |
| 宝贝 JOJO | 11 | 喂饭、刷牙、搭积木、梳头、开早餐店、搭小车乐园、玩具小卖部、汉字修理铺、接金币、节奏乐队、小小天平 |

在首页选择动画和任务，用 WASD、方向键或屏幕按钮在 2D 地图上移动。走近另一位角色后，台词会显示在角色旁的气泡里，操作仍在地图下方，可以听口供、递道具、送包裹、搭桥或一起解决任务。超级飞侠和宇宙护卫队的靶场只有玩家选中的角色和当前对手。每局依次挑战三位对手，击败一位后下一位才登场。《超级飞侠》有黑金小子、金小薇和比利威利，《宇宙护卫队》有霹雳、黑洞三角龙号和银河剑龙号。用空格、瞄准地图点击或「发射光球」按钮攻击。反派会预警并反击。被光球击中才在地图下方的护盾区随机出题，答对可恢复护盾。选角色时可选 1～6 年级，每个年级的语文、数学、英语各有 50 题，另有 20 道常识题。同一局优先出未见过的题。击中反派就解锁下一处挑战。警长任务在地图上走访警员和羚羚羊，再比对线索。宝贝 JOJO 的生活任务使用动画剧照与道具动画，支持中英词汇。

跳远时按住空格或屏幕上的蓄力按钮，接近满格时松开。超过满格要重新蓄力，每一次有效起跳都会和发挥在 80%～95% 的电脑对手比较距离。

接物任务可选角色和题目年级。按 A / D、左右方向键或屏幕方向按钮移动，也可以用手指或鼠标直接点地面。漏接时暂停并抽题，答对才继续。

双机接力、管道抢修、脚印追踪、节奏乐队和小小天平也可选题目年级。挑战失败时在场景内答题，答对后重试出错的步骤。

动画图源可在以下公开页面核对。素材随应用本地加载。

- 《超级飞侠》全队宣传图和乐迪、多多、小爱角色图，来自 [FunnyFlux 的角色授权资料页](https://inabooth.io/en/ip/INB-0OKV-TLJD)。
- 《宇宙护卫队》团队封面和原片预览图，来自 [完美鲲鹏的动画介绍](https://animation.games.wanmei.com/inside.html)。
- 《拉布拉多警长》团队图和剧集宣传图，来自宝宝巴士的 [角色介绍](https://www.babybus.com/global/zh-hant/character) 和 [动画目录](https://www.babybus.com/global/zh-hant/video)。
- 《宝贝JOJO》封面及喂饭、刷牙、收玩具相关配图，来自 [宝宝巴士的《超级宝贝JoJo》剧集目录](https://act.babybus.com/Share/MediaShare?albumid=LPib&mediaid=V1M&pid=WH)。

靶场反派头像使用 [黑金小子](https://superwingshome.com/en-ca/products/super-wings-season-10-dark-golden-boy-large-transforming-robot) 和 [霸王龙号·霹雳](https://www.toysruschina.com/zh-cn/cosmicrew-10005308.html) 的商品照片。

地图上的其他同系列伙伴也能靠近对话。大鹏使用 [奥迪双钻商品图](https://superwingshome.com/en-gb/products/super-wings-big-wing-museum-aircraft-playset)，流星使用 [完美鲲鹏角色图](https://animation.games.wanmei.com/inside.html)，小哆哆使用 [宝宝巴士《小哆哆当警察》配图](https://www.babybus.com/product/video)。

金小薇与恐龙机甲用的是 [超级飞侠商品页](https://superwingshome.com/products/super-wings-season-8-mini-transforming-toy-sally-traver-golden-girl-marty-lucie-taki-tiki-1) 和 [宇宙护卫队商品目录](https://www.jd.com/brand/6233aae9fb499de8e00e.html) 的商品图。比利威利用的是 [电影剧照](https://super-wings.fandom.com/wiki/Billy_Willy)。警长地图中，小云朵和农场爷爷来自 [宝宝巴士剧集配图](https://www.babybus.com/product/video)，克隆羊来自 [《啦咘啦哆警长大战羚羚羊》海报](https://www.iqiyi.com/a_1p59mh4z23t.html)。克隆羊的衣着名称用于区分地图人物。

预置游戏使用 2D 画面和本地角色图，无需 WebGL。角色资料图和动画剧照来自上面的公开来源。


豆包工作模式应用插件的接入调研见 [豆包插件调研](docs/doubao-plugin-research.md)。
