export const extraSeries = [
  {
    id: "cosmic",
    title: "宇宙护卫队",
    tagline: "第一人称答题打靶，校准救援信标",
    example: "比如：让彩虹带着监测仪去湖边，帮小动物找到干净的水。",
    roles: [
      {
        id: "storm",
        name: "风暴",
        icon: "🐯",
        skill: "带队救援"
      },
      {
        id: "lightning",
        name: "闪电",
        icon: "🐵",
        skill: "快速巡查"
      },
      {
        id: "rainbow",
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
        intro: "扮演风暴，在河湾击中正确的数字靶，给动物居民点亮补给站。"
      },
      {
        id: "lost-signal",
        role: "lightning",
        title: "消失的灯塔信号",
        icon: "📡",
        intro: "扮演闪电，认出正确的英文信标，恢复和通讯站的联系。"
      },
      {
        id: "lake-lab",
        role: "rainbow",
        title: "湖边观察实验室",
        icon: "🔬",
        intro: "扮演彩虹，识别正确的文字靶，为湖边实验室校准信号。"
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
        name: "啦咘啦哆警长",
        icon: "🐶",
        skill: "观察线索"
      },
      {
        id: "doberman",
        name: "杜兵警员",
        icon: "🐕",
        skill: "维护小镇秩序"
      },
      {
        id: "papillon",
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
        intro: "小羊在森林公园弄丢了蓝书包。扮演警长，到现场找线索，查清是谁挪动了书包。"
      },
      {
        id: "school-crossing",
        role: "doberman",
        title: "校门口的安全通道",
        icon: "🚦",
        intro: "校门等候区的路锥不见了。扮演杜兵，找齐线索，看看是谁把它们挪走了。"
      },
      {
        id: "park-markers",
        role: "papillon",
        title: "公园路牌去哪了",
        icon: "🗺️",
        intro: "公园的路牌失踪了。扮演小蝶，核对现场痕迹，查出谁把路牌搬走。"
      }
    ]
  },
  {
    id: "jojo",
    title: "宝贝JOJO",
    tagline: "挑对工具，喂饭、刷牙、收玩具",
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
        id: "toy-home",
        role: "jojo-brother",
        title: "玩具回家啦",
        icon: "🧸",
        intro: "飞飞哥哥和 JOJO 一起收玩具。找对收纳盒，把积木和小车送回家。"
      }
    ]
  }
];
