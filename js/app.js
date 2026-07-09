class App {
  constructor() {
    this.data = {
      highScore: 0,
      unlockedLevel: 1,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight
    }
    this.load()
    window.addEventListener('resize', () => {
      this.data.screenWidth = window.innerWidth
      this.data.screenHeight = window.innerHeight
    })
  }

  load() {
    try {
      const raw = localStorage.getItem('airplane_game_data')
      if (raw) {
        const d = JSON.parse(raw)
        this.data.highScore = d.highScore || 0
        this.data.unlockedLevel = d.unlockedLevel || 1
      }
    } catch (e) { /* ignore */ }
  }

  save() {
    try {
      localStorage.setItem('airplane_game_data', JSON.stringify({
        highScore: this.data.highScore,
        unlockedLevel: this.data.unlockedLevel
      }))
    } catch (e) { /* ignore */ }
  }
}

const app = new App()
export default app
