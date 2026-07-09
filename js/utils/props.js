import CONSTANTS from './constants.js'

const PROP_DEFINITIONS = {
  weapon_up: {
    name: '武器升级', color: '#ff8800', glowColor: 'rgba(255,136,0,0.4)',
    icon: 'W', duration: 0, description: '提升武器等级'
  },
  shield: {
    name: '护盾', color: '#00ccff', glowColor: 'rgba(0,204,255,0.4)',
    icon: 'S', duration: 8000, description: '抵挡一次伤害'
  },
  bomb: {
    name: '全屏炸弹', color: '#ff2244', glowColor: 'rgba(255,34,68,0.4)',
    icon: 'B', duration: 0, description: '清除所有敌人'
  },
  health: {
    name: '生命恢复', color: '#44ff44', glowColor: 'rgba(68,255,68,0.4)',
    icon: 'H', duration: 0, description: '恢复一条生命'
  },
  speed: {
    name: '速度提升', color: '#ffff00', glowColor: 'rgba(255,255,0,0.4)',
    icon: '>', duration: 5000, description: '提升移动速度'
  },
  score_x2: {
    name: '分数加倍', color: '#ff44ff', glowColor: 'rgba(255,68,255,0.4)',
    icon: '2', duration: 10000, description: '得分翻倍'
  }
}

class Prop {
  constructor(type, x, y) {
    this.type = type
    this.x = x
    this.y = y
    this.width = 24
    this.height = 24
    this.speed = 1.5
    this.alive = true
    this.bobTimer = Math.random() * 1000
    this.glowPhase = 0
    const def = PROP_DEFINITIONS[type]
    this.color = def.color
    this.glowColor = def.glowColor
    this.icon = def.icon
  }

  update(dt) {
    this.y += this.speed
    this.bobTimer += dt
    this.glowPhase += 0.05
  }

  isOffScreen(screenHeight) {
    return this.y > screenHeight + 30
  }

  collect(player) {
    this.alive = false
    switch (this.type) {
      case CONSTANTS.PROP_TYPES.WEAPON_UP:
        if (player.weaponLevel < CONSTANTS.PLAYER.MAX_WEAPON_LEVEL) player.weaponLevel++
        break
      case CONSTANTS.PROP_TYPES.SHIELD:
        player.hasShield = true
        player.shieldTimer = PROP_DEFINITIONS.shield.duration
        break
      case CONSTANTS.PROP_TYPES.BOMB:
        return { type: 'bomb' }
      case CONSTANTS.PROP_TYPES.HEALTH:
        if (player.lives < CONSTANTS.PLAYER.MAX_LIVES) player.lives++
        break
      case CONSTANTS.PROP_TYPES.SPEED:
        player.speedBoost = true
        player.speedTimer = PROP_DEFINITIONS.speed.duration
        break
      case CONSTANTS.PROP_TYPES.SCORE_X2:
        player.scoreMultiplier = 2
        player.scoreTimer = PROP_DEFINITIONS.score_x2.duration
        break
    }
    return null
  }
}

function createRandomProp(x, y) {
  const roll = Math.random()
  let cumulative = 0
  for (const [key, rate] of Object.entries(CONSTANTS.DROP_RATES)) {
    cumulative += rate
    if (roll < cumulative) return new Prop(CONSTANTS.PROP_TYPES[key], x, y)
  }
  return null
}

export { PROP_DEFINITIONS, Prop, createRandomProp }
