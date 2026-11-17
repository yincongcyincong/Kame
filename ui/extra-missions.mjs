export const extraSeries = [
  {
    id: "cosmic",
    title: "宇宙护卫队",
    tagline: "第一人称答题打靶，校准救援信标",
    example: "比如：让彩虹带着监测仪去湖边，帮小动物找到干净的水。",
    roles: [
      {
        id: "storm",
        portrait: "/art/cosmic-storm.png",
        name: "风暴",
        icon: "🐯",
        skill: "带队救援"
      },
      {
        id: "lightning",
        portrait: "/art/cosmic-lightning.png",
        name: "闪电",
        icon: "🐵",
        skill: "快速巡查"
      },
      {
        id: "rainbow",
        portrait: "/art/cosmic-rainbow.png",
        name: "彩虹",
        icon: "🐰",
        skill: "观察和分析"
      }
    ],
    plans: [
      {
        id: "river-team",
        role: "storm",
        title: "河湾救援站",
        icon: "🛟",
        intro: "在河湾击中正确的数字靶，给动物居民点亮补给站。"
      },
      {
        id: "lost-signal",
        role: "lightning",
        title: "消失的灯塔信号",
        icon: "📡",
        intro: "认出正确的英文信标，恢复和通讯站的联系。"
      },
      {
        id: "lake-lab",
        role: "rainbow",
        title: "湖边观察实验室",
        icon: "🔬",
        intro: "识别正确的文字靶，为湖边实验室校准信号。"
      }
    ]
  },
  {
    id: "labrador",
    title: "拉布拉多警长",
    tagline: "找线索、交叉验证，锁定关键人物",
    example: "比如：让警长沿着脚印查一查，找回小羊落在公园里的书包。",
    roles: [
      {
        id: "labrador",
        portrait: "/art/labrador-sheriff.png",
        name: "啦咘啦哆警长",
        icon: "🐶",
        skill: "观察线索"
      },
      {
        id: "doberman",
        portrait: "/art/labrador-doberman.png",
        name: "杜兵警员",
        icon: "🐕",
        skill: "维护小镇秩序"
      },
      {
        id: "papillon",
        portrait: "/art/labrador-papillon.png",
        name: "小蝶警员",
        icon: "🔎",
        skill: "整理线索和地图"
      }
    ],
    plans: [
      {
        id: "lost-bag",
        role: "labrador",
        title: "不见的蓝书包",
        icon: "🎒",
        intro: "小羊在森林公园弄丢了蓝书包。到现场找线索，查清是谁挪动了书包。"
      },
      {
        id: "school-crossing",
        role: "doberman",
        title: "校门口的安全通道",
        icon: "🚦",
        intro: "校门等候区的路锥不见了。找齐线索，看看是谁把它们挪走了。"
      },
      {
        id: "park-markers",
        role: "papillon",
        title: "公园路牌去哪了",
        icon: "🗺️",
        intro: "公园的路牌失踪了。核对现场痕迹，查出谁把路牌搬走。"
      }
    ]
  },
  {
    id: "jojo",
    title: "宝贝JOJO",
    tagline: "跟 JOJO 一起吃饭、刷牙、梳头和搭积木",
    example: "比如：让 JoJo 和姐姐在客厅搭一座积木桥，玩完把玩具收好。",
    roles: [
      {
        id: "baby-jojo",
        name: "JoJo",
        icon: "🧸",
        skill: "整理玩具"
      },
      {
        id: "jojo-sister",
        name: "米娅姐姐",
        icon: "🎨",
        skill: "陪 JoJo 学习"
      },
      {
        id: "jojo-brother",
        name: "飞飞哥哥",
        icon: "🧺",
        skill: "帮忙准备活动"
      }
    ],
    plans: [
      {
        id: "jojo-lunch",
        scene: "/art/jojo-breakfast.jpg",
        role: "baby-jojo",
        title: "给 JOJO 喂饭",
        icon: "🥣",
        intro: "JOJO 肚子饿了。给他准备饭碗，用对餐具，再喂他喝水。"
      },
      {
        id: "jojo-teeth",
        scene: "/art/jojo-brush.jpg",
        role: "jojo-sister",
        title: "帮 JOJO 刷牙",
        icon: "🪥",
        intro: "米娅姐姐要帮 JOJO 刷牙。先备好牙刷和牙膏，再一起把牙齿刷干净。"
      },
      {
        id: "jojo-blocks",
        role: "jojo-brother",
        title: "和 JOJO 搭积木",
        icon: "🧸",
        intro: "和飞飞哥哥一起转动、叠放积木，搭出塔、小桥和台阶。"
      },
      {
        id: "jojo-hair",
        scene: "/art/jojo-cover.jpg",
        role: "baby-jojo",
        title: "给 JOJO 梳头",
        icon: "🪮",
        intro: "用手指或鼠标握住梳子，顺着 JOJO 的发卷一下一下梳顺。"
      }
    ]
  }
];
