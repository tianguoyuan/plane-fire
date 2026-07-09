import CONSTANTS from './constants.js'
import LEVELS from './levels.js'
import { Enemy, createEnemy } from './enemies.js'
import { Boss } from './bosses.js'
import { PROP_DEFINITIONS, Prop, createRandomProp } from './props.js'

class Game {
  constructor(canvas, screenWidth, screenHeight, level, savedState) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    this.pixelRatio = window.devicePixelRatio || 2

    canvas.width = screenWidth * this.pixelRatio
    canvas.height = screenHeight * this.pixelRatio
    this.ctx.scale(this.pixelRatio, this.pixelRatio)

    this.state = CONSTANTS.GAME_STATE.PLAYING
    this.level = level
    this.levelConfig = structuredClone(LEVELS[level - 1])

    savedState = savedState || {}
    this.player = {
      x: screenWidth / 2 - CONSTANTS.PLAYER.WIDTH / 2,
      y: screenHeight - 100,
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
    this.particles = []
    this.floatingTexts = []

    this.score = savedState.score || 0
    this.levelScore = 0
    this.totalKills = 0
    this.bombUsed = false
    this.bombEffectTimer = 0
    this._startTime = performance.now()
    this._lastFire = 0

    this.stars = []
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * screenWidth,
        y: Math.random() * screenHeight,
        size: Math.random() * 2 + 0.5,
        speed: 0.5 + Math.random() * this.levelConfig.backgroundSpeed
      })
    }
    this.bgOffset = 0

    this.touchX = this.player.x + this.player.width / 2
    this.touchY = this.player.y + this.player.height / 2
    this.isTouching = false

    this.lastTime = performance.now()
    this.gameTime = 0
    this.totalEnemyCount = this.levelConfig.enemySpawns.reduce((s, sp) => s + sp.count, 0)
    this.spawnTimers = []
    this.spawnCompleted = []
    this.initLevelSpawns()

    this.gameOverCallback = null
    this.levelCompleteCallback = null
    this.scoreUpdateCallback = null
    this.stateChangeCallback = null

    this.running = true
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
  }

  #loop() {
    if (!this.running) return

    const now = performance.now()
    const dt = Math.min(now - this.lastTime, 33)
    this.lastTime = now
    this.gameTime += dt

    this.#update(dt, now)
    this.#render()

    if (this.running) {
      requestAnimationFrame(() => this.#loop())
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
    this.#updateEnemies(dt, now)
    this.#updateBoss(dt, now)
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
    }
  }

  #updateBullets() {
    this.playerBullets = this.playerBullets.filter(b => {
      b.x += b.vx; b.y += b.vy
      return b.alive && b.y > -20 && b.x > -20 && b.x < this.screenWidth + 20
    })
    this.enemyBullets = this.enemyBullets.filter(b => {
      b.x += b.vx; b.y += b.vy
      return b.alive && b.y < this.screenHeight + 30 && b.x > -30 && b.x < this.screenWidth + 30
    })
  }

  #updateEnemies(dt, now) {
    this.enemies = this.enemies.filter(e => {
      e.update(dt, now)
      if (e.shouldFire(now)) {
        this.enemyBullets.push({
          x: e.x + e.width / 2, y: e.y + e.height,
          vx: (Math.random() - 0.5) * 1, vy: CONSTANTS.BULLET.ENEMY_SPEED,
          radius: 4, color: e.bulletColor || '#ff6666', damage: 1, alive: true
        })
      }
      return e.alive && !e.isOffScreen(this.screenHeight)
    })
  }

  #updateBoss(dt, now) {
    if (!this.boss || !this.boss.alive) return
    this.boss.update(dt, now)
    if (!this.boss.entering && this.state === CONSTANTS.GAME_STATE.BOSS_FIGHT) {
      this.boss.getNextPattern(now, this.enemyBullets, this.player)
    }
  }

  #updateProps(dt) {
    this.props = this.props.filter(p => {
      p.update(dt)
      return p.alive && !p.isOffScreen(this.screenHeight)
    })
  }

  #updateParticles(dt) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx; p.y += p.vy
      p.life -= dt; p.size *= 0.97
      return p.life > 0
    })
  }

  #updateFloatingTexts(dt) {
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.y -= t.speed; t.life -= dt
      t.alpha = Math.max(0, t.life / t.maxLife)
      return t.life > 0
    })
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
    if (!this.levelConfig.boss || this.boss) return
    this.state = CONSTANTS.GAME_STATE.BOSS_ALERT
    setTimeout(() => {
      if (!this.running) return
      this.boss = new Boss(this.levelConfig.boss, this.screenWidth, this.screenHeight)
      this.state = CONSTANTS.GAME_STATE.BOSS_FIGHT
      if (this.stateChangeCallback) this.stateChangeCallback(this.state, this.boss)
    }, 2000)
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
      p.hasShield = false; p.shieldTimer = 0
      p.invincible = true; p.invincibleTimer = performance.now()
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
    this.score += points; this.levelScore += points; this.totalKills++
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
    setTimeout(() => {
      if (!this.running) return
      this.state = CONSTANTS.GAME_STATE.LEVEL_COMPLETE
      if (this.levelCompleteCallback) this.levelCompleteCallback(this.score, this.level)
    }, 2000)
  }

  #checkWinCondition(now) {
    if (this.state !== CONSTANTS.GAME_STATE.PLAYING) return
    const done = this.spawnCompleted.every(s => s)
    if (done && this.enemies.length === 0 && !this.boss) this.startBossFight()
  }

  #activateBomb() {
    this.bombEffectTimer = 500
    this.#spawnExplosion(this.screenWidth / 2, this.screenHeight / 2, '#ffffff', 60)
    this.#addFloatingText(this.screenWidth / 2, this.screenHeight / 2 - 50, '💣 全屏炸弹!', '#ff4444')
  }

  #clearAllEnemies() {
    this.enemies.forEach(e => this.#spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color, 8))
    this.enemies = []
    for (let i = 0; i < Math.min(this.enemyBullets.length, 30); i++) {
      this.#spawnHitParticles(this.enemyBullets[i].x, this.enemyBullets[i].y, '#ff4444')
    }
    this.enemyBullets = []
    if (this.boss && this.boss.alive) this.boss.takeDamage(10)
  }

  #spawnExplosion(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5
      const speed = 1 + Math.random() * 3
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: 2 + Math.random() * 4, color, life: 400 + Math.random() * 300, maxLife: 700 })
    }
  }

  #spawnHitParticles(x, y, color) {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 2
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: 1.5 + Math.random() * 2, color, life: 200 + Math.random() * 100, maxLife: 300 })
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
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.7})`
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
    ctx.beginPath(); ctx.moveTo(cx - 6, p.y + p.height); ctx.lineTo(cx, p.y + p.height + 8 + Math.random() * 6); ctx.lineTo(cx + 6, p.y + p.height); ctx.fill()
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
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius || 4, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,100,100,0.2)'
      ctx.beginPath(); ctx.arc(b.x, b.y, (b.radius || 4) * 2, 0, Math.PI * 2); ctx.fill()
    })
  }

  #renderEnemies(ctx) {
    this.enemies.forEach(e => {
      if (!e.visible) return
      ctx.save()
      const cx = e.x + e.width / 2, cy = e.y + e.height / 2
      ctx.fillStyle = e.color
      ctx.beginPath(); ctx.moveTo(cx, e.y + e.height); ctx.lineTo(cx + e.width / 2, e.y); ctx.lineTo(cx - e.width / 2, e.y); ctx.closePath(); ctx.fill()
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
    if (b.flashTimer < 100) ctx.globalAlpha = 0.7 + Math.random() * 0.3
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
    const levelLabel = this.boss ? `第${this.level}关 · ${this.boss.name}` : `第${this.level}关`
    ctx.fillText(levelLabel, 12, 22)
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffd700'
    ctx.fillText(`分数: ${this.score}`, W - 12, 22)
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
    const progress = this.totalEnemyCount > 0 ? Math.min(this.totalKills / this.totalEnemyCount, 1) : 0
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
    ctx.restore()
  }

  // ========== CALLBACKS ==========

  onGameOver(cb) { this.gameOverCallback = cb }
  onLevelComplete(cb) { this.levelCompleteCallback = cb }
  onScoreUpdate(cb) { this.scoreUpdateCallback = cb }
  onStateChange(cb) { this.stateChangeCallback = cb }

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
