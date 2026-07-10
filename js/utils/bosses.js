const BOSS_PATTERNS = {
  spread: {
    name: '散弹',
    execute(boss, now, bullets) {
      const count = 7 + boss.phase * 3
      const angleStep = Math.PI / (count + 1)
      const startAngle = -Math.PI / 3 + angleStep / 2
      const speed = 2.5 + boss.phase * 0.5
      for (let i = 0; i < count; i++) {
        const angle = startAngle + angleStep * i
        bullets.push({
          x: boss.x + boss.width / 2, y: boss.y + boss.height,
          vx: Math.sin(angle) * speed, vy: Math.cos(angle) * speed,
          radius: 4, color: '#ff3366', damage: 1, alive: true
        })
      }
      boss.patternTimers.spread = now + (1000 - boss.phase * 100)
    }
  },
  aimed: {
    name: '瞄准弹',
    execute(boss, now, bullets, player) {
      if (!player) return
      const dx = player.x + player.width / 2 - (boss.x + boss.width / 2)
      const dy = player.y + player.height / 2 - (boss.y + boss.height)
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const speed = 3 + boss.phase * 0.5
      bullets.push({
        x: boss.x + boss.width / 2, y: boss.y + boss.height,
        vx: (dx / dist) * speed, vy: (dy / dist) * speed,
        radius: 5, color: '#ff00ff', damage: 1, alive: true
      })
      boss.patternTimers.aimed = now + (1200 - boss.phase * 150)
    }
  },
  circle: {
    name: '环形弹',
    execute(boss, now, bullets) {
      const count = 16 + boss.phase * 4
      const angleStep = (Math.PI * 2) / count
      const speed = 2 + boss.phase * 0.3
      for (let i = 0; i < count; i++) {
        const angle = angleStep * i
        bullets.push({
          x: boss.x + boss.width / 2, y: boss.y + boss.height / 2,
          vx: Math.sin(angle) * speed, vy: Math.cos(angle) * speed,
          radius: 4, color: '#ffaa00', damage: 1, alive: true
        })
      }
      boss.patternTimers.circle = now + (1500 - boss.phase * 150)
    }
  },
  laser: {
    name: '激光',
    execute(boss, now, bullets) {
      const count = 5 + boss.phase
      for (let i = 0; i < count; i++) {
        const offsetX = (i - (count - 1) / 2) * 25
        bullets.push({
          x: boss.x + boss.width / 2 + offsetX, y: boss.y + boss.height,
          vx: 0, vy: 6 + boss.phase, radius: 3, color: '#00ffff',
          damage: 1, alive: true, isLaser: true
        })
      }
      boss.patternTimers.laser = now + (1200 - boss.phase * 100)
    }
  },
  meteor: {
    name: '流星',
    execute(boss, now, bullets, player, screenWidth) {
      const count = 5 + boss.phase * 2
      for (let i = 0; i < count; i++) {
        const x = Math.random() * (screenWidth - 20) + 10
        bullets.push({
          x, y: -20, vx: (Math.random() - 0.5) * 1.5,
          vy: 4 + Math.random() * 3 + boss.phase, radius: 8,
          color: '#ff4400', damage: 2, alive: true, isMeteor: true
        })
      }
      boss.patternTimers.meteor = now + (2000 - boss.phase * 200)
    }
  },
  spin: {
    name: '旋弹',
    execute(boss, now, bullets) {
      if (!boss.spinAngle) boss.spinAngle = 0
      boss.spinAngle += boss.id === 'shadow_demon' || boss.id === 'ultimate_destruction' ? 0.3 : 0.2
      const rings = boss.id === 'shadow_demon' || boss.id === 'ultimate_destruction' ? 2 : 1
      const count = 12 + boss.phase * 2
      const speed = 2 + boss.phase * 0.3
      for (let r = 0; r < rings; r++) {
        const offset = r * (Math.PI / count)
        for (let i = 0; i < count; i++) {
          const angle = boss.spinAngle + (Math.PI * 2 / count) * i + offset
          bullets.push({
            x: boss.x + boss.width / 2, y: boss.y + boss.height / 2,
            vx: Math.sin(angle) * speed, vy: Math.cos(angle) * speed,
            radius: 3, color: '#ff66ff', damage: 1, alive: true
          })
        }
      }
      const cooldown = boss.id === 'iron_beast' ? 800 : boss.id === 'thunder_dragon' ? 600 : boss.id === 'shadow_demon' ? 400 : 250
      boss.patternTimers.spin = now + cooldown
    }
  }
}

class Boss {
  constructor(config, screenWidth, screenHeight) {
    this.id = config.id
    this.name = config.name
    this.maxHp = config.hp
    this.hp = config.hp
    this.width = 80
    this.height = 64
    this.x = (screenWidth - this.width) / 2
    this.y = -this.height
    this.targetY = 60
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    this.alive = true
    this.entering = true
    this.patterns = config.patterns
    this.phaseThresholds = config.phaseThresholds || []
    this.phase = 0
    this.patternTimers = {}
    this.currentPatternIndex = 0
    this.patternSwitchTimer = 0
    this.patternInterval = 1000
    this.moveTimer = 0
    this.moveDir = 1
    this.defeated = false
    this.flashTimer = 0
    this.bars = config.bars || 1
    this.barHp = this.maxHp / this.bars
  }

  update(dt, now) {
    if (this.entering) {
      this.y += 1.5
      if (this.y >= this.targetY) {
        this.y = this.targetY
        this.entering = false
        this.patternSwitchTimer = now + 1500
      }
      return
    }
    this.moveTimer += dt
    if (this.moveTimer > 2000) {
      this.moveDir *= -1
      this.moveTimer = 0
    }
    this.x += this.moveDir * 1.2
    this.x = Math.max(10, Math.min(this.screenWidth - this.width - 10, this.x))

    const hpPercent = this.hp / this.maxHp
    this.phase = 0
    for (let i = 0; i < this.phaseThresholds.length; i++) {
      if (hpPercent <= this.phaseThresholds[i]) this.phase = i + 1
    }
    this.flashTimer += dt
  }

  getNextPattern(now, bullets, player) {
    if (now < this.patternSwitchTimer) return null
    const pattern = this.patterns[this.currentPatternIndex]
    this.currentPatternIndex = (this.currentPatternIndex + 1) % this.patterns.length
    const timer = this.patternTimers[pattern]
    if (timer && now < timer) return null
    const fn = BOSS_PATTERNS[pattern]
    if (fn) fn.execute(this, now, bullets, player, this.screenWidth)
    this.patternSwitchTimer = now + Math.max(400, this.patternInterval - this.phase * 200)
  }

  takeDamage(dmg = 1) {
    this.hp -= dmg
    this.flashTimer = 0
    if (this.hp <= 0) {
      this.hp = 0; this.alive = false; this.defeated = true
      return true
    }
    return false
  }
}

export { BOSS_PATTERNS, Boss }
