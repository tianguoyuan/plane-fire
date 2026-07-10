import app from '../app.js'
import Game from '../utils/game.js'
import CONSTANTS from '../utils/constants.js'
import LEVELS from '../utils/levels.js'

const BOSS_RUSH_LEVEL = 0

const PAUSE_STATES = new Set([CONSTANTS.GAME_STATE.PLAYING, CONSTANTS.GAME_STATE.BOSS_FIGHT])

let game = null
let currentLevel = 1
let savedState = { weaponLevel: 1, lives: 3, score: 0 }
let bossRushStartIndex = 0

export function init(level, options = {}) {
  currentLevel = level
  bossRushStartIndex = level === BOSS_RUSH_LEVEL ? (options.bossStartIndex || 0) : 0
  savedState = { weaponLevel: 1, lives: 3, score: 0 }
  const page = document.getElementById('page-game')

  page.innerHTML = `
    <canvas id="gameCanvas"></canvas>
    <button class="pause-btn" id="pauseBtn">⏸</button>
    <button class="ultima-btn" id="ultimaBtn">🔥<span class="ultima-count" id="ultimaCount">3</span></button>
    <div class="overlay" id="gameOverlay">
      <div class="overlay-bg"></div>
      <div class="overlay-panel game-overlay-panel">
        <h2 class="overlay-title" id="overlayTitle"></h2>
        <p class="overlay-score" id="overlayScore"></p>
        <div class="overlay-btns">
          <button class="btn btn-primary" id="overlayBtn">重新挑战</button>
          <button class="btn btn-secondary" id="overlayHome" style="display:none">返回首页</button>
        </div>
      </div>
    </div>
    <div class="overlay" id="pauseOverlay">
      <div class="overlay-bg" id="pauseMask"></div>
      <div class="overlay-panel game-overlay-panel">
        <h2 class="overlay-title">⏸ 暂停</h2>
        <div class="overlay-btns">
          <button class="btn btn-primary" id="resumeBtn">返回游戏</button>
          <button class="btn btn-secondary" id="homeFromPauseBtn">返回主菜单</button>
        </div>
      </div>
    </div>
  `

  const canvas = document.getElementById('gameCanvas')
  const ctx = canvas.getContext('2d')

  const resizeCanvas = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx.scale(dpr, dpr)
    return { w, h }
  }

  const { w, h } = resizeCanvas()
  window.addEventListener('resize', () => {
    const { w: nw, h: nh } = resizeCanvas()
    if (game) {
      game.screenWidth = nw
      game.screenHeight = nh
    }
  })

  document.getElementById('pauseBtn').addEventListener('click', onPauseToggle)
  document.getElementById('pauseMask').addEventListener('click', onResume)
  document.getElementById('resumeBtn').addEventListener('click', onResume)
  document.getElementById('homeFromPauseBtn').addEventListener('click', () => {
    document.getElementById('pauseOverlay').classList.remove('active')
    goHome()
  })
  document.getElementById('ultimaBtn').addEventListener('click', () => {
    if (game) game.activateUltima()
  })

  startGame(canvas, w, h)

  // 触摸事件
  canvas.addEventListener('touchstart', onTouch, { passive: false })
  canvas.addEventListener('touchmove', onTouch, { passive: false })
  canvas.addEventListener('touchend', onTouchEnd, { passive: false })
  canvas.addEventListener('touchcancel', onTouchEnd, { passive: false })

  // 鼠标事件
  canvas.addEventListener('mousedown', onMouseDown)
  canvas.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('mouseleave', onMouseUp)
}

function onPauseToggle() {
  if (!game || !PAUSE_STATES.has(game.state)) return
  game.pause()
  document.getElementById('pauseOverlay').classList.add('active')
}

function onResume() {
  if (!game) return
  document.getElementById('pauseOverlay').classList.remove('active')
  game.resume()
}

function startGame(canvas, w, h, state) {
  document.getElementById('gameOverlay').classList.remove('active')
  document.getElementById('pauseOverlay').classList.remove('active')

  if (game) { game.destroy(); game = null }

  game = new Game(canvas, w, h, currentLevel, state || savedState, bossRushStartIndex)

  game.onScoreUpdate(() => {})
  game.onStateChange((state, boss) => {
    if (state === CONSTANTS.GAME_STATE.BOSS_FIGHT) {
      try { navigator.vibrate?.(100) } catch (e) { /* ignore */ }
    }
  })
  game.onUltimaUpdate((count) => {
    const el = document.getElementById('ultimaCount')
    if (el) el.textContent = count
  })
  game.onGameOver((score) => {
    const isNew = score > app.data.highScore
    if (isNew) { app.data.highScore = score; app.save() }
    const levelInfo = currentLevel === BOSS_RUSH_LEVEL ? 'BOSS 连战' : `第${currentLevel}关 - ${LEVELS[currentLevel - 1]?.name || ''}`
    showOverlay(isNew ? '🏆 新纪录!' : '💀 游戏结束', `得分: ${score} | 到达: ${levelInfo}`, '重新挑战', false)
  })
  game.onLevelComplete((score) => {
    const next = currentLevel + 1
    if (currentLevel !== BOSS_RUSH_LEVEL && next > app.data.unlockedLevel) {
      app.data.unlockedLevel = Math.min(next, LEVELS.length)
      app.save()
    }
    const isNew = score > app.data.highScore
    if (isNew) { app.data.highScore = score; app.save() }
    savedState = {
      x: game.player.x,
      y: game.player.y,
      weaponLevel: game.player.weaponLevel,
      lives: game.player.lives,
      score: game.score,
      ultimaCount: game.ultimaCount
    }
    const btnText = currentLevel === BOSS_RUSH_LEVEL || next > LEVELS.length ? '返回首页' : '下一关'
    const title = currentLevel === BOSS_RUSH_LEVEL ? '🏆 BOSS 连战通关!' : '🎉 关卡通过!'
    showOverlay(title, `得分: ${score}`, btnText, true)
  })
}

function showOverlay(title, score, btnText, levelComplete) {
  const overlay = document.getElementById('gameOverlay')
  document.getElementById('overlayTitle').textContent = title
  document.getElementById('overlayScore').textContent = score
  document.getElementById('overlayBtn').textContent = btnText
  const homeBtn = document.getElementById('overlayHome')
  homeBtn.style.display = !levelComplete && btnText !== '返回首页' ? 'block' : 'none'

  document.getElementById('overlayBtn').onclick = () => {
    if (btnText === '返回首页') { goHome(); return }
    if (btnText === '下一关') {
      currentLevel = Math.min(currentLevel + 1, LEVELS.length)
      if (game) {
        savedState = {
          x: game.player.x,
          y: game.player.y,
          weaponLevel: game.player.weaponLevel,
          lives: game.player.lives,
          score: game.score,
          ultimaCount: game.ultimaCount
        }
      }
    } else {
      savedState = { weaponLevel: 1, lives: 3, score: 0 }
    }
    const canvas = document.getElementById('gameCanvas')
    resizeAndRestart(canvas)
  }
  homeBtn.onclick = goHome

  overlay.classList.add('active')
}

function resizeAndRestart(canvas) {
  const w = window.innerWidth, h = window.innerHeight
  const dpr = window.devicePixelRatio || 1
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  canvas.getContext('2d').scale(dpr, dpr)
  startGame(canvas, w, h, savedState)
}

function goHome() {
  if (game) { game.destroy(); game = null }
  document.getElementById('page-game').classList.remove('active')
  document.getElementById('page-home').classList.add('active')
  import('./index.js').then(mod => mod.refresh())
}

// --- 输入处理 ---
function getPos(e) {
  if (e.touches) {
    const t = e.touches[0] || e.changedTouches[0]
    return { x: t.clientX, y: t.clientY }
  }
  return { x: e.clientX, y: e.clientY }
}

function onTouch(e) {
  e.preventDefault()
  if (!game) return
  const p = getPos(e)
  game.setTouch(p.x, p.y)
}

function onTouchEnd(e) {
  e.preventDefault()
  if (game) game.clearTouch()
}

let mouseDown = false
function onMouseDown(e) {
  mouseDown = true
  if (game) game.setTouch(e.clientX, e.clientY)
}
function onMouseMove(e) {
  if (mouseDown && game) game.setTouch(e.clientX, e.clientY)
}
function onMouseUp() {
  mouseDown = false
  if (game) game.clearTouch()
}
