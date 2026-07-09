const ENEMY_TYPES = {
  basic: {
    name: '小型敌机', hp: 1, speed: 2, width: 30, height: 28,
    score: 10, fireRate: 0, color: '#ff4444', bulletColor: '#ff6666'
  },
  fast: {
    name: '高速敌机', hp: 1, speed: 4, width: 24, height: 24,
    score: 15, fireRate: 0, color: '#ff8800', bulletColor: '#ffaa44'
  },
  tank: {
    name: '重型敌机', hp: 3, speed: 1.2, width: 40, height: 36,
    score: 30, fireRate: 0, color: '#aa44ff', bulletColor: '#cc66ff'
  },
  sniper: {
    name: '狙击敌机', hp: 2, speed: 1.5, width: 28, height: 32,
    score: 25, fireRate: 2500, color: '#ff00aa', bulletColor: '#ff44cc'
  },
  stealth: {
    name: '隐形敌机', hp: 1, speed: 3, width: 22, height: 22,
    score: 20, fireRate: 0, color: '#00ccff', bulletColor: '#66eeff',
    blinkInterval: 500
  }
}

class Enemy {
  constructor(type, x, y, levelMultiplier = 1) {
    const config = ENEMY_TYPES[type]
    this.type = type
    this.x = x
    this.y = y
    this.width = config.width
    this.height = config.height
    this.hp = Math.ceil(config.hp * (1 + (levelMultiplier - 1) * 0.1))
    this.maxHp = this.hp
    this.speed = config.speed * (1 + (levelMultiplier - 1) * 0.05)
    this.score = config.score
    this.fireRate = config.fireRate
    this.color = config.color
    this.bulletColor = config.bulletColor
    this.alive = true
    this.lastFire = 0
    this.movePattern = 'straight'
    this.moveTimer = 0
    this.blinkTimer = 0
    this.visible = true
    this.blinkInterval = config.blinkInterval || 0
    if (Math.random() < 0.3) this.movePattern = 'sine'
  }

  update(dt, now) {
    this.y += this.speed
    if (this.movePattern === 'sine') {
      this.moveTimer += dt
      this.x += Math.sin(this.moveTimer * 0.003) * 1.5
    }
    if (this.blinkInterval > 0) {
      this.blinkTimer += dt
      if (this.blinkTimer > this.blinkInterval) {
        this.blinkTimer = 0
        this.visible = !this.visible
      }
    }
  }

  shouldFire(now) {
    if (this.fireRate <= 0) return false
    if (now - this.lastFire >= this.fireRate) {
      this.lastFire = now
      return true
    }
    return false
  }

  takeDamage(dmg = 1) {
    this.hp -= dmg
    if (this.hp <= 0) { this.alive = false; return true }
    return false
  }

  isOffScreen(screenHeight) {
    return this.y > screenHeight + 50
  }
}

function createEnemy(type, screenWidth, y, levelMultiplier) {
  const config = ENEMY_TYPES[type]
  const x = Math.random() * (screenWidth - config.width - 40) + 20
  return new Enemy(type, x, y || -config.height, levelMultiplier)
}

export { ENEMY_TYPES, Enemy, createEnemy }
