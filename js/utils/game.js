import CONSTANTS from './constants.js'
import LEVELS, { BOSS_RUSH } from './levels.js'
import { Enemy, createEnemy } from './enemies.js'
import { Boss, BOSS_PATTERNS } from './bosses.js'
import { PROP_DEFINITIONS, Prop, createRandomProp } from './props.js'

class Game {
  constructor(canvas, screenWidth, screenHeight, level, savedState, bossRushStartIndex) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    this.pixelRatio = window.devicePixelRatio || 2

    canvas.width = screenWidth * this.pixelRatio
    canvas.height = screenHeight * this.pixelRatio
    this.ctx.scale(this.pixelRatio, this.pixelRatio)

    this.state = CONSTANTS.GAME_STATE.PLAYING
    this.level = level || 1
    if (level === 0) {
      this.levelConfig = { ...BOSS_RUSH, enemySpawns: [] }
      this._bossRushIndex = bossRushStartIndex || 0
    } else {
      this.levelConfig = { ...LEVELS[level - 1], enemySpawns: LEVELS[level - 1].enemySpawns.map(s => ({ ...s })) }
      this._bossRushIndex = -1
    }

    savedState = savedState || {}
    this.player = {
      x: savedState.x != null ? Math.max(0, Math.min(screenWidth - CONSTANTS.PLAYER.WIDTH, savedState.x)) : screenWidth / 2 - CONSTANTS.PLAYER.WIDTH / 2,
      y: savedState.y != null ? Math.max(0, Math.min(screenHeight - CONSTANTS.PLAYER.HEIGHT, savedState.y)) : screenHeight - 100,
      width: CONSTANTS.PLAYER.WIDTH,
      height: CONSTANTS.PLAYER.HEIGHT,
      speed: CONSTANTS.PLAYER.SPEED,
      lives: savedState.lives || 3,
      weaponLevel: savedState.weaponLevel || 1,
      hasShield: false,
      shieldTimer: 0,
      speedBoost: false,
      speedTimer: 0,
      scoreMultiplier: 1,
      scoreTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      alive: true,
      blinkTimer: 0
    }

    this.playerBullets = []
    this.enemyBullets = []
    this.enemies = []
    this.props = []
    this.boss = null
    this._particlePool = []
    for (let i = 0; i < 300; i++) this._particlePool.push({})
    this.particles = []
    this.floatingTexts = []

    this.score = savedState.score || 0
    this.ultimaCount = savedState.ultimaCount != null ? savedState.ultimaCount : 3
    this.ultimaBeam = null
    this.levelScore = 0
    this.totalKills = 0
    this.totalResolved = 0
    this.bombUsed = false
    this.bombEffectTimer = 0
    this._startTime = performance.now() + 5000
    this._lastFire = 0
    this._bossRushPropTimer = 0
    this._spinTimer = 0

    this.stars = []
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * screenWidth,
        y: Math.random() * screenHeight,
        size: Math.random() * 2 + 0.5,
        speed: 0.5 + Math.random() * this.levelConfig.backgroundSpeed,
        alpha: 0.3 + Math.random() * 0.7
      })
    }
    this.bgOffset = 0

    this.touchX = this.player.x + this.player.width / 2
    this.touchY = this.player.y + this.player.height / 2
    this.isTouching = false

    this.lastTime = performance.now()
    this.gameTime = 0
    this.levelStartTime = performance.now()
    this.totalEnemyCount = this.levelConfig.enemySpawns.reduce((s, sp) => s + sp.count, 0)
    this.spawnTimers = []
    this.spawnCompleted = []
    this.initLevelSpawns()

    this.gameOverCallback = null
    this.levelCompleteCallback = null
    this.scoreUpdateCallback = null
    this.stateChangeCallback = null
    this.ultimaUpdateCallback = null

    this.running = true
    this._boundLoop = this.#loop.bind(this)
    this.#loop()
  }

  initLevelSpawns() {
    this.spawnTimers = this.levelConfig.enemySpawns.map(() => 0)
    this.spawnCompleted = this.levelConfig.enemySpawns.map(() => false)
  }

  setTouch(x, y) {
    this.isTouching = true
    this.touchX = x
    this.touchY = y
  }

  clearTouch() {
    this.isTouching = false
    this.touchX = this.player.x + this.player.width / 2
    this.touchY = this.player.y + this.player.height / 2
  }

  #loop() {
    if (!this.running) return

    const now = performance.now()
    const rawDt = now - this.lastTime
    if (rawDt > 50) {
      this.lastTime = now
      requestAnimationFrame(this._boundLoop)
      return
    }
    const dt = rawDt
    this.lastTime = now
    this.gameTime += dt

    if (this.state !== CONSTANTS.GAME_STATE.PAUSED) {
      this.#update(dt, now)
      this.#render()
    }

    if (this.running) {
      requestAnimationFrame(this._boundLoop)
    }
  }

  destroy() {
    this.running = false
  }

  // ========== UPDATE ==========

  #update(dt, now) {
    if (this.state === CONSTANTS.GAME_STATE.GAME_OVER ||
        this.state === CONSTANTS.GAME_STATE.LEVEL_COMPLETE) return

    if (this.bombEffectTimer > 0) {
      this.bombEffectTimer -= dt
      if (this.bombEffectTimer <= 0) this.#clearAllEnemies()
    }

    if (this.state === CONSTANTS.GAME_STATE.BOSS_ALERT) return

    this.#updatePlayer(dt, now)
    this.#updateBullets()
    this.#updateUltima()
    this.#updateEnemies(dt, now)
    this.#updateBoss(dt, now)
    if (this._bossRushIndex >= 0 && this.state === CONSTANTS.GAME_STATE.BOSS_FIGHT) {
      this._bossRushPropTimer += dt
      if (this._bossRushPropTimer > 3000) {
    this._bossRushPropTimer = 0
    this._bossRushGapTimer = 0
        const prop = createRandomProp(Math.random() * (this.screenWidth - 40) + 20, -20)
        if (prop) this.props.push(prop)
      }
    }
    this.#updateProps(dt)
    this.#updateParticles(dt)
    this.#updateFloatingTexts(dt)
    this.#updateBackground(dt)
    this.#checkCollisions()
    this.#checkWinCondition(now)

    if (this.state === CONSTANTS.GAME_STATE.PLAYING) {
      this.#spawnEnemies(now)
    }
  }

  #updatePlayer(dt, now) {
    const p = this.player
    if (!p.alive) return

    if (this.isTouching) {
      const speed = p.speedBoost ? p.speed * 1.5 : p.speed
      const dx = this.touchX - (p.x + p.width / 2)
      const dy = this.touchY - (p.y + p.height / 2)
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 2) {
        p.x += (dx / dist) * Math.min(speed, dist)
        p.y += (dy / dist) * Math.min(speed, dist)
      }
    }
    p.x = Math.max(0, Math.min(this.screenWidth - p.width, p.x))
    p.y = Math.max(0, Math.min(this.screenHeight - p.height - 20, p.y))

    if (p.invincible) {
      p.blinkTimer += dt
      if (now - p.invincibleTimer > CONSTANTS.PLAYER.INVINCIBLE_TIME) {
        p.invincible = false
        p.blinkTimer = 0
      }
    }
    if (p.hasShield) { p.shieldTimer -= dt; if (p.shieldTimer <= 0) p.hasShield = false }
    if (p.speedBoost) { p.speedTimer -= dt; if (p.speedTimer <= 0) p.speedBoost = false }
    if (p.scoreMultiplier > 1) { p.scoreTimer -= dt; if (p.scoreTimer <= 0) p.scoreMultiplier = 1 }

    this.#playerFire(now)
  }

  #playerFire(now) {
    if (now - this._lastFire < CONSTANTS.PLAYER.FIRE_RATE) return
    this._lastFire = now

    const px = this.player.x + this.player.width / 2
    const py = this.player.y
    const mk = (x, y, angle) => ({ x, y, width: CONSTANTS.BULLET.WIDTH, height: CONSTANTS.BULLET.HEIGHT, vx: angle * 2, vy: -CONSTANTS.BULLET.PLAYER_SPEED, damage: 1, alive: true, color: '#00ddff' })

    switch (this.player.weaponLevel) {
      case 1: this.playerBullets.push(mk(px, py, 0)); break
      case 2: this.playerBullets.push(mk(px - 8, py, 0), mk(px + 8, py, 0)); break
      case 3: this.playerBullets.push(mk(px, py, 0), mk(px - 10, py, -0.3), mk(px + 10, py, 0.3)); break
      case 4: this.playerBullets.push(mk(px - 12, py, -0.5), mk(px - 4, py, -0.15), mk(px + 4, py, 0.15), mk(px + 12, py, 0.5)); break
      case 5: this.playerBullets.push(mk(px, py, 0), mk(px - 10, py, -0.4), mk(px + 10, py, 0.4), mk(px - 18, py, -0.7), mk(px + 18, py, 0.7)); break
      case 6: this.playerBullets.push(mk(px, py, 0), mk(px - 8, py, -0.3), mk(px + 8, py, 0.3), mk(px - 16, py, -0.6), mk(px + 16, py, 0.6), mk(px - 22, py, -0.9), mk(px + 22, py, 0.9)); break
      case 7: this.playerBullets.push(mk(px, py, 0), mk(px - 7, py, -0.25), mk(px + 7, py, 0.25), mk(px - 14, py, -0.5), mk(px + 14, py, 0.5), mk(px - 20, py, -0.75), mk(px + 20, py, 0.75), mk(px - 26, py, -1), mk(px + 26, py, 1)); break
    }
  }

  #updateBullets() {
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i]
      b.x += b.vx; b.y += b.vy
      if (!b.alive || b.y < -20 || b.x < -20 || b.x > this.screenWidth + 20) {
        this.playerBullets.splice(i, 1)
      }
    }
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i]
      b.x += b.vx; b.y += b.vy
      if (!b.alive || b.y > this.screenHeight + 30 || b.x < -30 || b.x > this.screenWidth + 30) {
        this.enemyBullets.splice(i, 1)
      }
    }
  }

  #updateEnemies(dt, now) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]
      e.update(dt, now)
      if (e.shouldFire(now)) {
        this.enemyBullets.push({
          x: e.x + e.width / 2, y: e.y + e.height,
          vx: (Math.random() - 0.5) * 1, vy: CONSTANTS.BULLET.ENEMY_SPEED,
          radius: 4, color: e.bulletColor || '#ff6666', damage: 1, alive: true
        })
      }
      if (!e.alive || e.isOffScreen(this.screenHeight)) {
        this.enemies.splice(i, 1)
        if (e.alive) this.totalResolved++
      }
    }
  }

  #updateBoss(dt, now) {
    if (!this.boss || !this.boss.alive) return
    this.boss.update(dt, now)
    if (!this.boss.entering && this.state === CONSTANTS.GAME_STATE.BOSS_FIGHT) {
      this.boss.getNextPattern(now, this.enemyBullets, this.player)
      if (this.boss.patterns.includes('spin') && now >= this._spinTimer) {
        const timer = this.boss.patternTimers.spin
        if (!timer || now >= timer) {
          BOSS_PATTERNS.spin.execute(this.boss, now, this.enemyBullets, this.player, this.screenWidth)
        }
        this._spinTimer = now + 16
      }
    }
  }

  #updateProps(dt) {
    for (let i = this.props.length - 1; i >= 0; i--) {
      const p = this.props[i]
      p.update(dt)
      if (!p.alive || p.isOffScreen(this.screenHeight)) {
        this.props.splice(i, 1)
      }
    }
  }

  #updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx; p.y += p.vy
      p.life -= dt; p.size *= 0.97
      if (p.life <= 0) {
        this.particles.splice(i, 1)
        if (this._particlePool.length < 300) this._particlePool.push(p)
      }
    }
  }

  #updateFloatingTexts(dt) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i]
      t.y -= t.speed; t.life -= dt
      t.alpha = Math.max(0, t.life / t.maxLife)
      if (t.life <= 0) this.floatingTexts.splice(i, 1)
    }
  }

  #updateBackground(dt) {
    this.bgOffset = (this.bgOffset + this.levelConfig.backgroundSpeed * 0.5) % this.screenHeight
    this.stars.forEach(star => {
      star.y += star.speed
      if (star.y > this.screenHeight) { star.y = 0; star.x = Math.random() * this.screenWidth }
    })
  }

  #spawnEnemies(now) {
    const spawns = this.levelConfig.enemySpawns
    for (let i = 0; i < spawns.length; i++) {
      if (this.spawnCompleted[i]) continue
      const spawn = spawns[i]
      if (now - this._startTime < spawn.startDelay) continue
      if (this.spawnTimers[i] === 0) this.spawnTimers[i] = now
      if (now - this.spawnTimers[i] >= spawn.interval && spawn.count > 0) {
        this.enemies.push(createEnemy(spawn.type, this.screenWidth, -30, this.level))
        spawn.count--
        this.spawnTimers[i] = now
        if (spawn.count <= 0) this.spawnCompleted[i] = true
      }
    }
  }

  startBossFight() {
    if (this._bossRushIndex >= 0) {
      if (this._bossRushIndex >= this.levelConfig.bosses.length || this.boss) return
      this.state = CONSTANTS.GAME_STATE.BOSS_ALERT
      const config = this.levelConfig.bosses[this._bossRushIndex]
      setTimeout(() => {
        if (!this.running) return
        this.boss = new Boss(config, this.screenWidth, this.screenHeight)
        this.state = CONSTANTS.GAME_STATE.BOSS_FIGHT
        if (this._bossRushIndex >= 0) this._bossRushPropTimer = 3900
        if (this.stateChangeCallback) this.stateChangeCallback(this.state, this.boss)
      }, 2000)
    } else {
      if (!this.levelConfig.boss || this.boss) return
      this.state = CONSTANTS.GAME_STATE.BOSS_ALERT
      setTimeout(() => {
        if (!this.running) return
        this.boss = new Boss(this.levelConfig.boss, this.screenWidth, this.screenHeight)
        this.state = CONSTANTS.GAME_STATE.BOSS_FIGHT
        if (this.stateChangeCallback) this.stateChangeCallback(this.state, this.boss)
      }, 2000)
    }
  }

  // ========== COLLISION ==========

  #checkCollisions() {
    const p = this.player
    if (!p.alive) return

    this.playerBullets.forEach(bullet => {
      if (!bullet.alive) return
      this.enemies.forEach(enemy => {
        if (!enemy.alive) return
        if (this.#rectHit(bullet, enemy)) {
          bullet.alive = false
          if (enemy.takeDamage(bullet.damage || 1)) this.#onEnemyKilled(enemy)
          else this.#spawnHitParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color)
        }
      })
      if (this.boss && this.boss.alive && !this.boss.entering) {
        if (this.#rectHit(bullet, this.boss)) {
          bullet.alive = false
          this.boss.takeDamage(bullet.damage || 1)
          this.#spawnHitParticles(bullet.x, bullet.y, '#ffcc00')
          if (!this.boss.alive) this.#onBossDefeated()
        }
      }
    })

    if (!p.invincible) {
      this.enemyBullets.forEach(b => {
        if (!b.alive) return
        if (b.x >= p.x && b.x <= p.x + p.width && b.y >= p.y && b.y <= p.y + p.height) {
          b.alive = false; this.#playerHit()
        }
      })
      this.enemies.forEach(e => {
        if (!e.alive) return
        if (this.#rectHit(e, p)) { this.#onEnemyKilled(e); this.#playerHit() }
      })
      if (this.boss && this.boss.alive && !this.boss.entering) {
        if (this.#rectHit(p, this.boss)) this.#playerHit()
      }
    }

    this.props.forEach(prop => {
      if (!prop.alive) return
      if (this.#rectHit(prop, p)) {
        const result = prop.collect(p)
        if (result && result.type === 'bomb') this.#activateBomb()
        else if (result && result.type === 'ultima') { this.ultimaCount++; this.#updateUltimaBtn() }
        else this.#addFloatingText(prop.x + prop.width / 2, prop.y, PROP_DEFINITIONS[prop.type]?.name || '道具', prop.color)
      }
    })
  }

  #rectHit(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
  }

  #playerHit() {
    const p = this.player
    if (p.invincible) return
    if (p.hasShield) {
      this.#spawnHitParticles(p.x + p.width / 2, p.y + p.height / 2, '#00ccff')
      return
    }
    p.lives--
    p.invincible = true; p.invincibleTimer = performance.now()
    this.#spawnExplosion(p.x + p.width / 2, p.y + p.height / 2, '#ff4444', 20)
    if (p.weaponLevel > 1) p.weaponLevel--
    if (this.scoreUpdateCallback) this.scoreUpdateCallback(this.score, p.lives)
    if (p.lives <= 0) {
      p.alive = false
      this.#spawnExplosion(p.x + p.width / 2, p.y + p.height / 2, '#ff8800', 40)
      this.state = CONSTANTS.GAME_STATE.GAME_OVER
      if (this.gameOverCallback) this.gameOverCallback(this.score, this.level)
    }
  }

  #onEnemyKilled(enemy) {
    const points = enemy.score * this.player.scoreMultiplier
    this.score += points; this.levelScore += points; this.totalKills++; this.totalResolved++
    this.#spawnExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 10)
    this.#addFloatingText(enemy.x + enemy.width / 2, enemy.y, `+${points}`, '#ffff00')
    const prop = createRandomProp(enemy.x + enemy.width / 2 - 12, enemy.y + enemy.height / 2 - 12)
    if (prop) this.props.push(prop)
    if (this.scoreUpdateCallback) this.scoreUpdateCallback(this.score, this.player.lives)
  }

  #onBossDefeated() {
    this.score += 500 * this.level * this.player.scoreMultiplier
    this.#spawnExplosion(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2, '#ffcc00', 50)
    this.#addFloatingText(this.boss.x + this.boss.width / 2, this.boss.y - 20, `BOSS击败! +${500 * this.level}`, '#ffcc00')
    if (this.scoreUpdateCallback) this.scoreUpdateCallback(this.score, this.player.lives)
    if (this._bossRushIndex >= 0) {
      this._bossRushIndex++
      this.boss = null
      if (this._bossRushIndex < this.levelConfig.bosses.length) {
        setTimeout(() => {
          if (!this.running) return
          this.#startNextBoss()
        }, 5000)
        return
      }
    }
    setTimeout(() => {
      if (!this.running) return
      this.state = CONSTANTS.GAME_STATE.LEVEL_COMPLETE
      if (this.levelCompleteCallback) this.levelCompleteCallback(this.score, this.level)
    }, 2000)
  }

  #startNextBoss() {
    if (this._bossRushIndex < 0) return
    if (this._bossRushIndex >= this.levelConfig.bosses.length) return
    if (this.boss) return
    const config = this.levelConfig.bosses[this._bossRushIndex]
    if (!config) return
    this.boss = new Boss(config, this.screenWidth, this.screenHeight)
    this.state = CONSTANTS.GAME_STATE.BOSS_FIGHT
    this._bossRushPropTimer = 3900
    if (this.stateChangeCallback) this.stateChangeCallback(this.state, this.boss)
  }

  #checkWinCondition(now) {
    if (this.state !== CONSTANTS.GAME_STATE.PLAYING) return
    if (now < this._startTime) return
    const done = this.spawnCompleted.every(s => s)
    if (done && this.enemies.length === 0 && !this.boss) {
      if (this.levelConfig.boss || this._bossRushIndex >= 0) {
        this.startBossFight()
      } else {
        this.#completeLevel()
      }
    }
  }

  #completeLevel() {
    this.state = CONSTANTS.GAME_STATE.LEVEL_COMPLETE
    if (this.levelCompleteCallback) this.levelCompleteCallback(this.score, this.level)
  }

  #activateBomb() {
    this.bombEffectTimer = 500
    this.enemyBullets = []
    this.#spawnExplosion(this.screenWidth / 2, this.screenHeight / 2, '#ffffff', 60)
    this.#addFloatingText(this.screenWidth / 2, this.screenHeight / 2 - 50, '💣 全屏炸弹!', '#ff4444')
  }

  #clearAllEnemies() {
    this.enemies.forEach(e => {
      this.#spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color, 8)
      this.totalResolved++
    })
    this.enemies = []
    for (let i = 0; i < Math.min(this.enemyBullets.length, 30); i++) {
      this.#spawnHitParticles(this.enemyBullets[i].x, this.enemyBullets[i].y, '#ff4444')
    }
    this.enemyBullets = []
    if (this.boss && this.boss.alive) this.boss.takeDamage(10)
  }

  activateUltima() {
    if (this.ultimaCount <= 0 || this.ultimaBeam) return
    this.ultimaCount--
    this.#updateUltimaBtn()
    this.ultimaBeam = {
      x: 0, y: this.player.y,
      width: this.screenWidth, height: 20,
      alive: true, speed: 4
    }
    this.#spawnExplosion(this.screenWidth / 2, this.screenHeight / 2, '#ffff00', 30)
    this.#addFloatingText(this.screenWidth / 2, this.screenHeight / 2 - 50, '🔥 大招!', '#ff8800')
  }

  #updateUltima() {
    if (!this.ultimaBeam) return
    this.ultimaBeam.y -= this.ultimaBeam.speed
    if (this.ultimaBeam.y + this.ultimaBeam.height < 0) {
      this.ultimaBeam = null
      return
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]
      if (e.y + e.height > this.ultimaBeam.y && e.y < this.ultimaBeam.y + this.ultimaBeam.height) {
        this.score += e.score * this.player.scoreMultiplier
        this.totalKills++; this.totalResolved++
        this.#spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color, 8)
        this.enemies.splice(i, 1)
      }
    }
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i]
      if (b.y + (b.radius || 4) > this.ultimaBeam.y && b.y - (b.radius || 4) < this.ultimaBeam.y + this.ultimaBeam.height) {
        this.#spawnHitParticles(b.x, b.y, '#ff4444')
        this.enemyBullets.splice(i, 1)
      }
    }
  }

  #spawnExplosion(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
      const p = this._particlePool.pop() || {}
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5
      const speed = 1 + Math.random() * 3
      p.x = x; p.y = y
      p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed
      p.size = 2 + Math.random() * 4; p.color = color
      p.life = 400 + Math.random() * 300; p.maxLife = 700
      this.particles.push(p)
    }
  }

  #spawnHitParticles(x, y, color) {
    for (let i = 0; i < 5; i++) {
      const p = this._particlePool.pop() || {}
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 2
      p.x = x; p.y = y
      p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed
      p.size = 1.5 + Math.random() * 2; p.color = color
      p.life = 200 + Math.random() * 100; p.maxLife = 300
      this.particles.push(p)
    }
  }

  #addFloatingText(x, y, text, color) {
    this.floatingTexts.push({ x, y, text, color, speed: 1.5, life: 1200, maxLife: 1200, alpha: 1 })
  }

  // ========== RENDER ==========

  #render() {
    const ctx = this.ctx
    const W = this.screenWidth, H = this.screenHeight
    ctx.clearRect(0, 0, W, H)
    this.#renderBackground(ctx, W, H)
    this.#renderProps(ctx)
    this.#renderEnemies(ctx)
    this.#renderBoss(ctx)
    this.#renderUltima(ctx)
    this.#renderBullets(ctx)
    this.#renderPlayer(ctx)
    this.#renderParticles(ctx)
    this.#renderFloatingTexts(ctx)
    this.#renderUI(ctx, W, H)
    if (this.state === CONSTANTS.GAME_STATE.BOSS_ALERT) this.#renderBossAlert(ctx, W, H)
  }

  #renderBackground(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#050510'); g.addColorStop(0.5, '#0a0a2e'); g.addColorStop(1, '#050510')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    this.stars.forEach(star => {
      ctx.fillStyle = `rgba(255,255,255,${star.alpha})`
      ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill()
    })
    ctx.strokeStyle = 'rgba(0,150,255,0.05)'
    ctx.lineWidth = 1
    for (let y = -20; y < H + 20; y += 40) {
      const oy = (y + this.bgOffset) % (H + 40)
      ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(W, oy); ctx.stroke()
    }
  }

  #renderPlayer(ctx) {
    const p = this.player
    if (!p.alive) return
    if (p.invincible && Math.floor(p.blinkTimer / 100) % 2 === 0) return
    ctx.save()
    const cx = p.x + p.width / 2, cy = p.y + p.height / 2
    if (p.hasShield) {
      ctx.beginPath()
      ctx.arc(cx, cy, p.width * 0.8, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(0,204,255,${0.2 + Math.sin(performance.now() * 0.005) * 0.1})`
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,204,255,0.6)'; ctx.lineWidth = 2; ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255,150,0,0.6)'
    const flameLen = 8 + 4 * Math.sin(performance.now() * 0.015)
    ctx.beginPath(); ctx.moveTo(cx - 6, p.y + p.height); ctx.lineTo(cx, p.y + p.height + flameLen); ctx.lineTo(cx + 6, p.y + p.height); ctx.fill()
    ctx.fillStyle = '#4488ff'
    ctx.beginPath(); ctx.moveTo(cx, p.y); ctx.lineTo(cx + p.width / 2, p.y + p.height * 0.7); ctx.lineTo(cx + p.width / 3, p.y + p.height); ctx.lineTo(cx - p.width / 3, p.y + p.height); ctx.lineTo(cx - p.width / 2, p.y + p.height * 0.7); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#66aaff'
    ctx.beginPath(); ctx.moveTo(cx, p.y + 8); ctx.lineTo(cx + 8, p.y + p.height * 0.5); ctx.lineTo(cx, p.y + p.height * 0.6); ctx.lineTo(cx - 8, p.y + p.height * 0.5); ctx.closePath(); ctx.fill()
    ctx.fillStyle = 'rgba(0,200,255,0.6)'
    ctx.beginPath(); ctx.ellipse(cx, p.y + p.height * 0.35, 5, 7, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  #renderBullets(ctx) {
    this.playerBullets.forEach(b => {
      const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.height)
      g.addColorStop(0, 'rgba(0,221,255,0.8)'); g.addColorStop(0.5, 'rgba(0,221,255,0.4)'); g.addColorStop(1, 'rgba(0,221,255,0)')
      ctx.fillStyle = g; ctx.fillRect(b.x - b.width / 2, b.y, b.width, b.height)
    })
    this.enemyBullets.forEach(b => {
      ctx.fillStyle = b.color || '#ff6666'
      if (b.isLaser) {
        const halfW = (b.radius || 4) * 2.5
        ctx.fillRect(b.x - halfW, b.y - 8, halfW * 2, 16)
        ctx.fillStyle = 'rgba(0,255,255,0.15)'
        ctx.fillRect(b.x - halfW * 2, b.y - 12, halfW * 4, 24)
      } else {
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius || 4, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(255,100,100,0.2)'
        ctx.beginPath(); ctx.arc(b.x, b.y, (b.radius || 4) * 2, 0, Math.PI * 2); ctx.fill()
      }
    })
  }

  #renderEnemies(ctx) {
    this.enemies.forEach(e => {
      const stealth = e.blinkInterval > 0 && !e.visible
      ctx.save()
      const cx = e.x + e.width / 2, cy = e.y + e.height / 2
      if (stealth) {
        ctx.globalAlpha = 0.15
        ctx.fillStyle = e.color
        ctx.beginPath(); ctx.moveTo(cx, e.y + e.height); ctx.lineTo(cx + e.width / 2, e.y); ctx.lineTo(cx - e.width / 2, e.y); ctx.closePath(); ctx.fill()
        ctx.globalAlpha = 0.5
        ctx.strokeStyle = e.color
        ctx.lineWidth = 1.5
        ctx.shadowColor = e.color
        ctx.shadowBlur = 8
        ctx.beginPath(); ctx.moveTo(cx, e.y + e.height); ctx.lineTo(cx + e.width / 2, e.y); ctx.lineTo(cx - e.width / 2, e.y); ctx.closePath(); ctx.stroke()
        ctx.shadowBlur = 0
      } else {
        ctx.fillStyle = e.color
        ctx.beginPath(); ctx.moveTo(cx, e.y + e.height); ctx.lineTo(cx + e.width / 2, e.y); ctx.lineTo(cx - e.width / 2, e.y); ctx.closePath(); ctx.fill()
      }
      if (e.maxHp > 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(e.x, e.y - 6, e.width, 4)
        ctx.fillStyle = '#44ff44'; ctx.fillRect(e.x, e.y - 6, e.width * (e.hp / e.maxHp), 4)
      }
      ctx.restore()
    })
  }

  #renderBoss(ctx) {
    if (!this.boss || !this.boss.alive) return
    const b = this.boss
    ctx.save()
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2
    if (b.flashTimer < 100) ctx.globalAlpha = 0.7 + 0.3 * Math.sin(performance.now() * 0.02)
    ctx.fillStyle = '#8844ff'
    ctx.beginPath()
    ctx.moveTo(cx, b.y)
    ctx.lineTo(cx + b.width * 0.6, b.y + b.height * 0.3)
    ctx.lineTo(cx + b.width * 0.8, b.y + b.height * 0.5)
    ctx.lineTo(cx + b.width * 0.5, b.y + b.height)
    ctx.lineTo(cx, b.y + b.height * 0.9)
    ctx.lineTo(cx - b.width * 0.5, b.y + b.height)
    ctx.lineTo(cx - b.width * 0.8, b.y + b.height * 0.5)
    ctx.lineTo(cx - b.width * 0.6, b.y + b.height * 0.3)
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#aa66ff'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(cx - b.width * 0.3, b.y + b.height * 0.3); ctx.lineTo(cx + b.width * 0.3, b.y + b.height * 0.3); ctx.lineTo(cx + b.width * 0.2, b.y + b.height * 0.6); ctx.lineTo(cx - b.width * 0.2, b.y + b.height * 0.6); ctx.closePath(); ctx.stroke()
    const pulse = 0.8 + Math.sin(performance.now() * 0.003) * 0.2
    ctx.fillStyle = `rgba(255,200,0,${pulse})`
    ctx.beginPath(); ctx.arc(cx, b.y + b.height * 0.45, 8, 0, Math.PI * 2); ctx.fill()
    const barColors = ['#44ff44', '#88ff00', '#ffdd00', '#ff8800', '#ff4444']
    const bw = b.width + 40, bh = 10, bx = b.x - 20, by = b.y - 20
    const segW = bw / b.bars
    for (let i = 0; i < b.bars; i++) {
      const sx = bx + segW * i
      const remain = Math.max(0, Math.min(b.hp - b.barHp * i, b.barHp))
      const fill = remain / b.barHp
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(sx, by, segW - 1, bh)
      if (fill > 0) {
        ctx.fillStyle = barColors[i % barColors.length]
        ctx.fillRect(sx, by, (segW - 1) * fill, bh)
      }
    }
    ctx.restore()
  }

  #renderUltima(ctx) {
    if (!this.ultimaBeam) return
    ctx.save()
    const b = this.ultimaBeam
    const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.height)
    g.addColorStop(0, 'rgba(255,200,0,0)')
    g.addColorStop(0.3, 'rgba(255,200,0,0.8)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.7, 'rgba(255,200,0,0.8)')
    g.addColorStop(1, 'rgba(255,200,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(b.x, b.y, b.width, b.height)
    const pulse = 0.5 + Math.sin(performance.now() * 0.02) * 0.3
    ctx.fillStyle = `rgba(255,255,200,${pulse * 0.3})`
    ctx.fillRect(b.x - 10, b.y - 5, b.width + 20, b.height + 10)
    ctx.restore()
  }

  #renderProps(ctx) {
    this.props.forEach(p => {
      ctx.save()
      const cx = p.x + p.width / 2, cy = p.y + p.height / 2
      const gs = p.width * 0.8 + Math.sin(p.glowPhase) * 4
      ctx.fillStyle = p.glowColor; ctx.beginPath(); ctx.arc(cx, cy, gs, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(cx, cy, p.width / 2 - 2, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(p.icon, cx, cy)
      ctx.restore()
    })
  }

  #renderParticles(ctx) {
    this.particles.forEach(p => {
      ctx.save()
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    })
  }

  #renderFloatingTexts(ctx) {
    this.floatingTexts.forEach(t => {
      ctx.save()
      ctx.globalAlpha = t.alpha; ctx.fillStyle = t.color
      ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(t.text, t.x, t.y)
      ctx.restore()
    })
  }

  #renderBossAlert(ctx, W, H) {
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#ff4444'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.globalAlpha = 0.7 + Math.sin(performance.now() * 0.005) * 0.3
    ctx.fillText('⚠ WARNING ⚠', W / 2, H / 2 - 30)
    ctx.font = 'bold 28px sans-serif'; ctx.fillStyle = '#ff8800'
    ctx.fillText('BOSS 来袭!', W / 2, H / 2 + 30)
    ctx.restore()
  }

  #renderUI(ctx, W, H) {
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, 44)
    ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    const levelLabel = this._bossRushIndex >= 0
      ? `BOSS 连战 ${this._bossRushIndex + 1}/${this.levelConfig.bosses.length}`
      : `第${this.level}关`
    ctx.fillText(levelLabel, 12, 22)
    let textX = 12 + ctx.measureText(levelLabel).width + 16
    ctx.fillStyle = '#ffd700'
    ctx.fillText(`分数: ${this.score}`, textX, 22)
    textX += ctx.measureText(`分数: ${this.score}`).width + 16
    if (this.boss) {
      ctx.fillStyle = this._bossRushIndex >= 0 ? '#ff6666' : '#aa66ff'
      ctx.fillText(this.boss.name, textX, 22)
    }
    if (this.player.alive) {
      for (let i = 0; i < this.player.lives; i++) {
        ctx.fillStyle = '#ff4444'
        ctx.beginPath(); ctx.moveTo(12 + i * 22, 52); ctx.lineTo(12 + i * 22 - 6, 60); ctx.lineTo(12 + i * 22 + 6, 60); ctx.closePath(); ctx.fill()
      }
    }
    ctx.fillStyle = '#ff8800'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left'
    ctx.fillText(`武器 Lv.${this.player.weaponLevel}`, 12, 74)
    let bx = 100
    if (this.player.hasShield) { ctx.fillStyle = '#00ccff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`🛡️ ${Math.ceil(this.player.shieldTimer / 1000)}s`, bx, 74); bx += 60 }
    if (this.player.speedBoost) { ctx.fillStyle = '#ffff00'; ctx.fillText(`⚡ ${Math.ceil(this.player.speedTimer / 1000)}s`, bx, 74); bx += 60 }
    if (this.player.scoreMultiplier > 1) { ctx.fillStyle = '#ff44ff'; ctx.fillText(`✖️${this.player.scoreMultiplier} ${Math.ceil(this.player.scoreTimer / 1000)}s`, bx, 74) }
    // 进度条: 仅敌机击杀进度，与Boss无关
    const progress = this.totalEnemyCount > 0 ? Math.min(this.totalResolved / this.totalEnemyCount, 1) : 0
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(12, 84, W - 24, 6)
    ctx.fillStyle = '#00ff88'
    ctx.fillRect(12, 84, (W - 24) * progress, 6)
    if (this.state === CONSTANTS.GAME_STATE.GAME_OVER) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#ff4444'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('游戏结束', W / 2, H / 2 - 40)
      ctx.fillStyle = '#fff'; ctx.font = '28px sans-serif'
      ctx.fillText(`最终得分: ${this.score}`, W / 2, H / 2 + 20)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '20px sans-serif'
      ctx.fillText(`到达关卡: 第${this.level}关`, W / 2, H / 2 + 60)
    }
    if (this.state === CONSTANTS.GAME_STATE.LEVEL_COMPLETE) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('🎉 通关!', W / 2, H / 2 - 30)
      ctx.fillStyle = '#fff'; ctx.font = '26px sans-serif'
      ctx.fillText(`得分: ${this.score}`, W / 2, H / 2 + 30)
    }
    if (this._bossRushIndex < 0) {
      const levelToastElapsed = performance.now() - this.levelStartTime
      if (levelToastElapsed < 3000) {
        ctx.save()
        ctx.globalAlpha = levelToastElapsed < 300 ? 1 : Math.max(0, 1 - (levelToastElapsed - 300) / 2700)
        ctx.fillStyle = '#fff'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(`第${this.level}关`, W / 2, H / 2)
        ctx.restore()
      }
    }
    ctx.restore()
  }

  // ========== CALLBACKS ==========

  onGameOver(cb) { this.gameOverCallback = cb }
  onLevelComplete(cb) { this.levelCompleteCallback = cb }
  onScoreUpdate(cb) { this.scoreUpdateCallback = cb }
  onStateChange(cb) { this.stateChangeCallback = cb }
  onUltimaUpdate(cb) { this.ultimaUpdateCallback = cb }
  #updateUltimaBtn() { if (this.ultimaUpdateCallback) this.ultimaUpdateCallback(this.ultimaCount) }

  pause() {
    if (this.state === CONSTANTS.GAME_STATE.PLAYING || this.state === CONSTANTS.GAME_STATE.BOSS_FIGHT) {
      this.state = CONSTANTS.GAME_STATE.PAUSED
    }
  }

  resume() {
    if (this.state === CONSTANTS.GAME_STATE.PAUSED) {
      this.state = this.boss ? CONSTANTS.GAME_STATE.BOSS_FIGHT : CONSTANTS.GAME_STATE.PLAYING
    }
  }
}

export default Game
