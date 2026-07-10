import app from '../app.js'
import LEVELS from '../utils/levels.js'
import { BOSS_RUSH_BOSSES } from '../utils/levels.js'

const LEVEL_NAMES = LEVELS.map(l => l.name)
const BOSS_NAMES = BOSS_RUSH_BOSSES.map(b => b.name)
let selectedLevel = 1

export function init() {
  const homePage = document.getElementById('page-home')
  if (!homePage) return

  selectedLevel = app.data.unlockedLevel

  homePage.innerHTML = `
    <div class="stars-bg"></div>
    <div class="title-area">
      <h1 class="title">飞 机 大 战</h1>
      <p class="subtitle">BOSS · 道具 · 关卡</p>
    </div>
    <div class="high-score" id="highScore">最高分：${app.data.highScore}</div>
    <div class="menu">
      <button class="btn btn-primary" id="btnStart">开始游戏</button>
      <button class="btn btn-primary" id="btnBossRush" style="background:linear-gradient(135deg,#ff4444,#cc0044);box-shadow:0 4px 20px rgba(255,0,0,0.4)">🔥 BOSS 连战</button>
      <button class="btn btn-secondary" id="btnLevels">选择关卡</button>
      <button class="btn btn-secondary" id="btnHelp">游戏说明</button>
    </div>
    <div class="overlay" id="levelOverlay">
      <div class="overlay-bg" id="levelMask"></div>
      <div class="overlay-panel level-panel">
        <h2 class="panel-title">选择关卡</h2>
        <div class="level-list" id="levelList"></div>
        <button class="panel-close" id="levelClose">关闭</button>
      </div>
    </div>
    <div class="overlay" id="helpOverlay">
      <div class="overlay-bg" id="helpMask"></div>
      <div class="overlay-panel help-panel">
        <h2 class="panel-title">游戏说明</h2>
        <div class="help-content">
          <p>🛩️ 触摸/鼠标拖拽控制飞机移动</p>
          <p>💥 自动射击，击败敌机获得分数</p>
          <p>⭐ 收集道具：</p>
          <p class="indent">🔫 武器升级 · 🛡️ 护盾</p>
          <p class="indent">💣 全屏炸弹 · ❤️ 生命恢复</p>
          <p class="indent">⚡ 速度提升 · ✨ 分数加倍</p>
          <p>👹 每关都有Boss，击败Boss通关</p>
          <p>💀 生命耗尽则游戏结束</p>
        </div>
        <button class="panel-close" id="helpClose">知道了</button>
      </div>
    </div>
    <div class="overlay" id="bossOverlay">
      <div class="overlay-bg" id="bossMask"></div>
      <div class="overlay-panel level-panel">
        <h2 class="panel-title">🔥 BOSS 连战</h2>
        <div class="level-list" id="bossList"></div>
        <button class="panel-close" id="bossClose">关闭</button>
      </div>
    </div>
  `

  buildLevelList()
  buildBossList()
  bindEvents()
}

export function refresh() {
  selectedLevel = app.data.unlockedLevel
  const hs = document.getElementById('highScore')
  if (hs) hs.textContent = `最高分：${app.data.highScore}`
  buildLevelList()
}

function buildLevelList() {
  const levelList = document.getElementById('levelList')
  if (!levelList) return
  levelList.innerHTML = ''

  for (let i = 0; i < LEVELS.length; i++) {
    const locked = i + 1 > app.data.unlockedLevel
    const div = document.createElement('div')
    div.className = `level-item ${locked ? 'locked' : 'unlocked'} ${i + 1 === selectedLevel ? 'selected' : ''}`
    div.dataset.level = i + 1
    div.innerHTML = `
      <span class="level-num">${i + 1}</span>
      <span class="level-name">${LEVEL_NAMES[i]}</span>
      <span class="level-status">${locked ? '🔒' : '▶'}</span>
    `
    if (!locked) {
      div.addEventListener('click', () => {
        toggleLevelOverlay()
        startGame(i + 1)
      })
    }
    levelList.appendChild(div)
  }
}

function bindEvents() {
  document.getElementById('btnStart').addEventListener('click', () => startGame(1))
  document.getElementById('btnBossRush').addEventListener('click', toggleBossOverlay)
  document.getElementById('btnLevels').addEventListener('click', toggleLevelOverlay)
  document.getElementById('btnHelp').addEventListener('click', toggleHelp)
  document.getElementById('levelMask').addEventListener('click', toggleLevelOverlay)
  document.getElementById('levelClose').addEventListener('click', toggleLevelOverlay)
  document.getElementById('helpMask').addEventListener('click', toggleHelp)
  document.getElementById('helpClose').addEventListener('click', toggleHelp)
  document.getElementById('bossMask').addEventListener('click', toggleBossOverlay)
  document.getElementById('bossClose').addEventListener('click', toggleBossOverlay)
}

function buildBossList() {
  const bossList = document.getElementById('bossList')
  if (!bossList) return
  bossList.innerHTML = ''

  for (let i = 0; i < BOSS_RUSH_BOSSES.length; i++) {
    const div = document.createElement('div')
    div.className = 'level-item unlocked'
    div.innerHTML = `
      <span class="level-num">${i + 1}</span>
      <span class="level-name">${BOSS_NAMES[i]}</span>
      <span class="level-status">▶</span>
    `
    const startIndex = i
    div.addEventListener('click', () => {
      toggleBossOverlay()
      startBossRush(startIndex)
    })
    bossList.appendChild(div)
  }
}

function toggleBossOverlay() {
  document.getElementById('bossOverlay').classList.toggle('active')
}

function startBossRush(startIndex) {
  document.getElementById('page-home').classList.remove('active')
  document.getElementById('page-game').classList.add('active')
  import('./game.js').then(mod => {
    mod.init(0, { bossStartIndex: startIndex })
  })
}
function toggleLevelOverlay() {
  document.getElementById('levelOverlay').classList.toggle('active')
}

function toggleHelp() {
  document.getElementById('helpOverlay').classList.toggle('active')
}

function startGame(level) {
  document.getElementById('page-home').classList.remove('active')
  document.getElementById('page-game').classList.add('active')
  import('./game.js').then(mod => {
    mod.init(level)
  })
}
