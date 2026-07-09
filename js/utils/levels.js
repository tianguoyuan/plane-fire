const BOSS_NAMES = [
  '侦察机首领', '突袭指挥官', '铁甲先锋', '空战督导',
  '钢铁巨兽',
  '暗夜猎手', '暴风驾驭者', '堡垒破坏者', '弹幕宗师',
  '雷霆飞龙',
  '星河征服者', '陨石召唤师', '电子幽灵', '死亡使者',
  '暗影魔王',
  '绝境战神', '无尽梦魇', '极限审判官', '最终执行官',
  '终极毁灭'
]

function bossForLevel(level) {
  let bars = 1
  if (level >= 5 && level <= 9) bars = 2
  else if (level >= 10 && level <= 14) bars = 3
  else if (level >= 15 && level <= 19) bars = 4
  else if (level === 20) bars = 5

  const specials = {
    5:  { id: 'iron_beast',         name: '钢铁巨兽',     hp: 80,  patterns: ['spread', 'line'],          phases: [0.5], bars: 2 },
    10: { id: 'thunder_dragon',     name: '雷霆飞龙',     hp: 150, patterns: ['spread', 'aimed', 'circle'], phases: [0.6, 0.3], bars: 3 },
    15: { id: 'shadow_demon',       name: '暗影魔王',     hp: 250, patterns: ['spread', 'aimed', 'circle', 'laser'], phases: [0.7, 0.4, 0.2], bars: 4 },
    20: { id: 'ultimate_destruction', name: '终极毁灭',   hp: 400, patterns: ['spread', 'aimed', 'circle', 'laser', 'meteor'], phases: [0.8, 0.6, 0.4, 0.2], bars: 5 }
  }
  if (specials[level]) return specials[level]

  const id = `boss_lv${level}`
  let hp, patterns, phases
  if (level <= 4) {
    hp = 20 + level * 10
    patterns = ['spread']
    phases = level >= 3 ? [0.4] : []
  } else if (level <= 9) {
    hp = 60 + (level - 5) * 15
    patterns = ['spread', 'aimed']
    phases = level >= 7 ? [0.5] : []
  } else if (level <= 14) {
    hp = 100 + (level - 10) * 20
    patterns = ['spread', 'aimed', 'circle']
    phases = level >= 12 ? [0.5, 0.25] : [0.4]
  } else {
    hp = 180 + (level - 15) * 30
    patterns = ['spread', 'aimed', 'circle', 'laser']
    phases = level >= 18 ? [0.6, 0.35, 0.15] : [0.5, 0.25]
  }
  return { id, name: BOSS_NAMES[level - 1], hp, patterns, phaseThresholds: phases, bars }
}

const LEVELS = [
  {
    id: 1, name: '初出茅庐',
    enemySpawns: [
      { type: 'basic', interval: 2000, count: 8, startDelay: 1000 }
    ],
    backgroundSpeed: 1, boss: bossForLevel(1)
  },
  {
    id: 2, name: '小试牛刀',
    enemySpawns: [
      { type: 'basic', interval: 1800, count: 10, startDelay: 1000 },
      { type: 'fast', interval: 2500, count: 4, startDelay: 8000 }
    ],
    backgroundSpeed: 1.2, boss: bossForLevel(2)
  },
  {
    id: 3, name: '渐入佳境',
    enemySpawns: [
      { type: 'basic', interval: 1500, count: 12, startDelay: 1000 },
      { type: 'fast', interval: 2000, count: 6, startDelay: 7000 },
      { type: 'tank', interval: 3000, count: 2, startDelay: 12000 }
    ],
    backgroundSpeed: 1.4, boss: bossForLevel(3)
  },
  {
    id: 4, name: '乘胜追击',
    enemySpawns: [
      { type: 'basic', interval: 1300, count: 14, startDelay: 500 },
      { type: 'fast', interval: 1800, count: 8, startDelay: 5000 },
      { type: 'tank', interval: 2500, count: 4, startDelay: 10000 }
    ],
    backgroundSpeed: 1.6, boss: bossForLevel(4)
  },
  {
    id: 5, name: 'Boss·钢铁巨兽',
    enemySpawns: [
      { type: 'basic', interval: 2000, count: 5, startDelay: 1000 }
    ],
    backgroundSpeed: 1.5, boss: bossForLevel(5)
  },
  {
    id: 6, name: '深入敌后',
    enemySpawns: [
      { type: 'basic', interval: 1200, count: 16, startDelay: 500 },
      { type: 'fast', interval: 1500, count: 10, startDelay: 4000 },
      { type: 'tank', interval: 2000, count: 5, startDelay: 8000 },
      { type: 'sniper', interval: 3000, count: 3, startDelay: 7000 }
    ],
    backgroundSpeed: 1.8, boss: bossForLevel(6)
  },
  {
    id: 7, name: '暗流涌动',
    enemySpawns: [
      { type: 'basic', interval: 1000, count: 20, startDelay: 500 },
      { type: 'fast', interval: 1200, count: 12, startDelay: 3000 },
      { type: 'tank', interval: 1800, count: 6, startDelay: 6000 },
      { type: 'sniper', interval: 2500, count: 5, startDelay: 5000 }
    ],
    backgroundSpeed: 2, boss: bossForLevel(7)
  },
  {
    id: 8, name: '空中堡垒',
    enemySpawns: [
      { type: 'basic', interval: 900, count: 24, startDelay: 500 },
      { type: 'fast', interval: 1000, count: 16, startDelay: 2000 },
      { type: 'tank', interval: 1500, count: 8, startDelay: 5000 },
      { type: 'sniper', interval: 2000, count: 6, startDelay: 4000 }
    ],
    backgroundSpeed: 2.2, boss: bossForLevel(8)
  },
  {
    id: 9, name: '弹幕如雨',
    enemySpawns: [
      { type: 'basic', interval: 800, count: 28, startDelay: 300 },
      { type: 'fast', interval: 900, count: 20, startDelay: 1500 },
      { type: 'tank', interval: 1200, count: 10, startDelay: 4000 },
      { type: 'sniper', interval: 1500, count: 8, startDelay: 3000 }
    ],
    backgroundSpeed: 2.5, boss: bossForLevel(9)
  },
  {
    id: 10, name: 'Boss·雷霆飞龙',
    enemySpawns: [
      { type: 'basic', interval: 2500, count: 4, startDelay: 2000 }
    ],
    backgroundSpeed: 2, boss: bossForLevel(10)
  },
  {
    id: 11, name: '星河远征',
    enemySpawns: [
      { type: 'basic', interval: 700, count: 30, startDelay: 300 },
      { type: 'fast', interval: 800, count: 22, startDelay: 1000 },
      { type: 'tank', interval: 1000, count: 12, startDelay: 3000 },
      { type: 'sniper', interval: 1200, count: 10, startDelay: 2000 },
      { type: 'stealth', interval: 3000, count: 3, startDelay: 5000 }
    ],
    backgroundSpeed: 2.8, boss: bossForLevel(11)
  },
  {
    id: 12, name: '陨石地带',
    enemySpawns: [
      { type: 'basic', interval: 600, count: 34, startDelay: 200 },
      { type: 'fast', interval: 700, count: 24, startDelay: 800 },
      { type: 'tank', interval: 900, count: 14, startDelay: 2500 },
      { type: 'sniper', interval: 1000, count: 12, startDelay: 1500 },
      { type: 'stealth', interval: 2500, count: 5, startDelay: 4000 }
    ],
    backgroundSpeed: 3, boss: bossForLevel(12)
  },
  {
    id: 13, name: '电子风暴',
    enemySpawns: [
      { type: 'basic', interval: 500, count: 38, startDelay: 200 },
      { type: 'fast', interval: 600, count: 26, startDelay: 500 },
      { type: 'tank', interval: 800, count: 16, startDelay: 2000 },
      { type: 'sniper', interval: 900, count: 14, startDelay: 1000 },
      { type: 'stealth', interval: 2000, count: 6, startDelay: 3000 }
    ],
    backgroundSpeed: 3.2, boss: bossForLevel(13)
  },
  {
    id: 14, name: '死亡领域',
    enemySpawns: [
      { type: 'basic', interval: 400, count: 42, startDelay: 100 },
      { type: 'fast', interval: 500, count: 30, startDelay: 400 },
      { type: 'tank', interval: 700, count: 18, startDelay: 1500 },
      { type: 'sniper', interval: 800, count: 16, startDelay: 800 },
      { type: 'stealth', interval: 1500, count: 8, startDelay: 2000 }
    ],
    backgroundSpeed: 3.5, boss: bossForLevel(14)
  },
  {
    id: 15, name: 'Boss·暗影魔王',
    enemySpawns: [
      { type: 'fast', interval: 3000, count: 3, startDelay: 2000 }
    ],
    backgroundSpeed: 2.5, boss: bossForLevel(15)
  },
  {
    id: 16, name: '绝地反击',
    enemySpawns: [
      { type: 'basic', interval: 350, count: 46, startDelay: 100 },
      { type: 'fast', interval: 400, count: 34, startDelay: 300 },
      { type: 'tank', interval: 600, count: 20, startDelay: 1000 },
      { type: 'sniper', interval: 700, count: 18, startDelay: 600 },
      { type: 'stealth', interval: 1200, count: 10, startDelay: 1500 }
    ],
    backgroundSpeed: 3.8, boss: bossForLevel(16)
  },
  {
    id: 17, name: '无尽挑战',
    enemySpawns: [
      { type: 'basic', interval: 300, count: 50, startDelay: 50 },
      { type: 'fast', interval: 350, count: 38, startDelay: 200 },
      { type: 'tank', interval: 500, count: 22, startDelay: 800 },
      { type: 'sniper', interval: 600, count: 20, startDelay: 500 },
      { type: 'stealth', interval: 1000, count: 12, startDelay: 1000 }
    ],
    backgroundSpeed: 4, boss: bossForLevel(17)
  },
  {
    id: 18, name: '极限试炼',
    enemySpawns: [
      { type: 'basic', interval: 250, count: 54, startDelay: 50 },
      { type: 'fast', interval: 300, count: 42, startDelay: 100 },
      { type: 'tank', interval: 400, count: 24, startDelay: 500 },
      { type: 'sniper', interval: 500, count: 22, startDelay: 400 },
      { type: 'stealth', interval: 800, count: 14, startDelay: 800 }
    ],
    backgroundSpeed: 4.5, boss: bossForLevel(18)
  },
  {
    id: 19, name: '最终幻想',
    enemySpawns: [
      { type: 'basic', interval: 200, count: 58, startDelay: 0 },
      { type: 'fast', interval: 250, count: 46, startDelay: 50 },
      { type: 'tank', interval: 350, count: 26, startDelay: 300 },
      { type: 'sniper', interval: 400, count: 24, startDelay: 200 },
      { type: 'stealth', interval: 600, count: 16, startDelay: 500 }
    ],
    backgroundSpeed: 5, boss: bossForLevel(19)
  },
  {
    id: 20, name: 'Boss·终极毁灭',
    enemySpawns: [
      { type: 'tank', interval: 2000, count: 2, startDelay: 3000 }
    ],
    backgroundSpeed: 3, boss: bossForLevel(20)
  }
]

export default LEVELS
