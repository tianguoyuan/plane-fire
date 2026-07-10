const BOSSES = {
  5:  { id: 'iron_beast',         name: '钢铁巨兽',     hp: 200, patterns: ['spread', 'aimed', 'spin'],        phaseThresholds: [0.4], bars: 2 },
  10: { id: 'thunder_dragon',     name: '雷霆飞龙',     hp: 400, patterns: ['spread', 'aimed', 'circle', 'spin'], phaseThresholds: [0.5, 0.25], bars: 3 },
  15: { id: 'shadow_demon',       name: '暗影魔王',     hp: 700, patterns: ['spread', 'aimed', 'circle', 'laser', 'spin'], phaseThresholds: [0.6, 0.3, 0.15], bars: 4 },
  20: { id: 'ultimate_destruction', name: '终极毁灭',   hp: 1200, patterns: ['spread', 'aimed', 'circle', 'laser', 'meteor', 'spin'], phaseThresholds: [0.7, 0.5, 0.3, 0.15], bars: 5 }
}

function bossForLevel(mergedLevel) {
  return BOSSES[mergedLevel * 5]
}

const BOSS_RUSH_BOSSES = [BOSSES[5], BOSSES[10], BOSSES[15], BOSSES[20]]

const LEVELS = [
  {
    id: 1, name: '钢铁巨兽',
    enemySpawns: [
      { type: 'basic', interval: 2000, count: 12, startDelay: 1000 },
      { type: 'basic', interval: 1800, count: 10, startDelay: 8000 },
      { type: 'fast', interval: 2500, count: 6, startDelay: 15000 },
      { type: 'basic', interval: 1500, count: 14, startDelay: 22000 },
      { type: 'fast', interval: 2000, count: 8, startDelay: 28000 },
      { type: 'tank', interval: 3000, count: 4, startDelay: 32000 },
      { type: 'basic', interval: 1300, count: 16, startDelay: 38000 },
      { type: 'fast', interval: 1800, count: 10, startDelay: 43000 },
      { type: 'tank', interval: 2500, count: 5, startDelay: 47000 }
    ],
    backgroundSpeed: 1.5, boss: bossForLevel(1)
  },
  {
    id: 2, name: '雷霆飞龙',
    enemySpawns: [
      { type: 'basic', interval: 1200, count: 18, startDelay: 1000 },
      { type: 'fast', interval: 1500, count: 12, startDelay: 6000 },
      { type: 'tank', interval: 2000, count: 6, startDelay: 10000 },
      { type: 'sniper', interval: 3000, count: 4, startDelay: 9000 },
      { type: 'basic', interval: 1000, count: 22, startDelay: 14000 },
      { type: 'fast', interval: 1200, count: 14, startDelay: 18000 },
      { type: 'tank', interval: 1800, count: 8, startDelay: 21000 },
      { type: 'sniper', interval: 2500, count: 6, startDelay: 20000 },
      { type: 'basic', interval: 900, count: 26, startDelay: 26000 },
      { type: 'fast', interval: 1000, count: 18, startDelay: 29000 },
      { type: 'tank', interval: 1500, count: 10, startDelay: 32000 },
      { type: 'sniper', interval: 2000, count: 8, startDelay: 31000 },
      { type: 'basic', interval: 800, count: 30, startDelay: 36000 },
      { type: 'fast', interval: 900, count: 22, startDelay: 38000 },
      { type: 'tank', interval: 1200, count: 12, startDelay: 40000 },
      { type: 'sniper', interval: 1500, count: 10, startDelay: 39000 }
    ],
    backgroundSpeed: 2, boss: bossForLevel(2)
  },
  {
    id: 3, name: '暗影魔王',
    enemySpawns: [
      { type: 'basic', interval: 700, count: 24, startDelay: 1000 },
      { type: 'fast', interval: 800, count: 16, startDelay: 4000 },
      { type: 'tank', interval: 1000, count: 10, startDelay: 7000 },
      { type: 'sniper', interval: 1200, count: 8, startDelay: 6000 },
      { type: 'stealth', interval: 3000, count: 4, startDelay: 8000 },
      { type: 'basic', interval: 600, count: 28, startDelay: 11000 },
      { type: 'fast', interval: 700, count: 20, startDelay: 13000 },
      { type: 'tank', interval: 900, count: 12, startDelay: 15000 },
      { type: 'sniper', interval: 1000, count: 10, startDelay: 14000 },
      { type: 'stealth', interval: 2500, count: 6, startDelay: 16000 },
      { type: 'basic', interval: 500, count: 32, startDelay: 20000 },
      { type: 'fast', interval: 600, count: 24, startDelay: 21000 },
      { type: 'tank', interval: 800, count: 14, startDelay: 23000 },
      { type: 'sniper', interval: 900, count: 12, startDelay: 22000 },
      { type: 'stealth', interval: 2000, count: 8, startDelay: 24000 },
      { type: 'basic', interval: 400, count: 36, startDelay: 28000 },
      { type: 'fast', interval: 500, count: 28, startDelay: 29000 },
      { type: 'tank', interval: 700, count: 16, startDelay: 30000 },
      { type: 'sniper', interval: 800, count: 14, startDelay: 29000 },
      { type: 'stealth', interval: 1500, count: 10, startDelay: 31000 }
    ],
    backgroundSpeed: 3, boss: bossForLevel(3)
  },
  {
    id: 4, name: '终极毁灭',
    enemySpawns: [
      { type: 'basic', interval: 350, count: 30, startDelay: 1000 },
      { type: 'fast', interval: 400, count: 22, startDelay: 2000 },
      { type: 'tank', interval: 600, count: 14, startDelay: 4000 },
      { type: 'sniper', interval: 700, count: 12, startDelay: 3000 },
      { type: 'stealth', interval: 1200, count: 8, startDelay: 5000 },
      { type: 'basic', interval: 300, count: 34, startDelay: 8000 },
      { type: 'fast', interval: 350, count: 26, startDelay: 9000 },
      { type: 'tank', interval: 500, count: 16, startDelay: 10000 },
      { type: 'sniper', interval: 600, count: 14, startDelay: 9000 },
      { type: 'stealth', interval: 1000, count: 10, startDelay: 11000 },
      { type: 'basic', interval: 250, count: 38, startDelay: 14000 },
      { type: 'fast', interval: 300, count: 30, startDelay: 15000 },
      { type: 'tank', interval: 400, count: 18, startDelay: 16000 },
      { type: 'sniper', interval: 500, count: 16, startDelay: 15000 },
      { type: 'stealth', interval: 800, count: 12, startDelay: 17000 },
      { type: 'basic', interval: 200, count: 42, startDelay: 20000 },
      { type: 'fast', interval: 250, count: 34, startDelay: 21000 },
      { type: 'tank', interval: 350, count: 20, startDelay: 22000 },
      { type: 'sniper', interval: 400, count: 18, startDelay: 21000 },
      { type: 'stealth', interval: 600, count: 14, startDelay: 23000 }
    ],
    backgroundSpeed: 4, boss: bossForLevel(4)
  }
]

const BOSS_RUSH = {
  id: 0, name: 'BOSS 连战',
  bossRush: true,
  bosses: BOSS_RUSH_BOSSES,
  backgroundSpeed: 2
}

export default LEVELS
export { BOSS_RUSH, BOSS_RUSH_BOSSES }
