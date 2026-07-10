const CONSTANTS = {
  GAME_STATE: {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    BOSS_ALERT: 'boss_alert',
    BOSS_FIGHT: 'boss_fight',
    LEVEL_COMPLETE: 'level_complete',
    GAME_OVER: 'game_over'
  },
  PLAYER: {
    WIDTH: 36,
    HEIGHT: 44,
    SPEED: 6,
    MAX_LIVES: 5,
    INVINCIBLE_TIME: 2000,
    FIRE_RATE: 200,
    MAX_WEAPON_LEVEL: 7
  },
  BULLET: {
    PLAYER_SPEED: 10,
    ENEMY_SPEED: 4,
    WIDTH: 6,
    HEIGHT: 14
  },
  PROP_TYPES: {
    WEAPON_UP: 'weapon_up',
    SHIELD: 'shield',
    BOMB: 'bomb',
    HEALTH: 'health',
    SPEED: 'speed',
    SCORE_X2: 'score_x2',
    ULTIMA: 'ultima'
  },
  DROP_RATES: {
    WEAPON_UP: 0.08,
    SHIELD: 0.05,
    BOMB: 0.04,
    HEALTH: 0.06,
    SPEED: 0.04,
    SCORE_X2: 0.03,
    ULTIMA: 0.02
  },
  SCREEN: {
    WIDTH: 375,
    HEIGHT: 667
  }
}

export default CONSTANTS
