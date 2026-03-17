// This is the baseclass for humans in-game

import SpriteAnimation from './sprite_animation.js'

// these are the default for spritesheets from https://notnullgames.github.io/universal-sprites/
const defaultAnimations = {
  'magic:north': [0, 1, 2, 3, 4, 5, 6],
  'magic:west': [13, 14, 15, 15, 17, 18, 19],
  'magic:south': [26, 27, 28, 29, 30, 31, 32],
  'magic:east': [39, 40, 41, 42, 43, 44, 45],
  'thrust:north': [52, 53, 54, 55, 56, 57, 58, 59],
  'thrust:west': [65, 66, 67, 68, 69, 70, 71, 72],
  'thrust:south': [78, 79, 80, 81, 82, 83, 84, 85],
  'thrust:east': [91, 92, 93, 94, 95, 96, 97, 98],
  'walk:east': [144, 145, 146, 147, 148, 149, 150],
  'walk:north': [105, 106, 107, 108, 109, 110, 111, 112],
  'walk:west': [118, 119, 120, 121, 122, 123, 124],
  'walk:south': [131, 132, 133, 134, 135, 136, 137],
  'pull:north': [156, 157, 158, 159, 160, 161],
  'pull:west': [169, 170, 171, 172, 173, 174],
  'pull:south': [182, 183, 184, 185, 186, 187],
  'pull:east': [195, 196, 197, 198, 199, 200],
  'bow:north': [208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220],
  'bow:west': [221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233],
  'bow:south': [234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246],
  'bow:east': [247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259],
  'die:south': [260, 261, 262, 263, 264, 265],
  'idle:north': [104],
  'idle:west': [117],
  'idle:south': [130],
  'idle:east': [143]
}

// die is only in 1 direction
defaultAnimations['die:north'] = defaultAnimations['die:south']
defaultAnimations['die:west'] = defaultAnimations['die:south']
defaultAnimations['die:east'] = defaultAnimations['die:south']

export default class Player {
  constructor({
    name = 'player',
    x = 0, y = 0,
    scale = 1,
    speed = 10,
    moveSpeed = 80,   // world pixels per second
    feetY = 20,       // px below sprite center to probe for collision
    feetW = 6,        // half-width of foot probe (left/right of center)
    animation = 'idle',
    facing = 'south',
    animations = defaultAnimations
  }) {
    this.name = name
    this.facing = facing
    this.animation = animation
    this.x = x
    this.y = y
    this.scale = scale
    this.speed = speed
    this.moveSpeed = moveSpeed
    this.feetY = feetY
    this.feetW = feetW
    this.animations = animations
    this.sprite = new SpriteAnimation(`assets/${name}.png`, { frame: 0, frameSize: { x: 64, y: 64 }, origin: { x: 32, y: 32 } })
  }

  // Returns { dx, dy } movement delta based on key input, updating facing/animation state
  input(r) {
    let dx = 0
    let dy = 0

    if (r.IsKeyDown(r.KEY_UP) || r.IsKeyDown(r.KEY_W)) { dy = -1; this.facing = 'north' }
    if (r.IsKeyDown(r.KEY_DOWN) || r.IsKeyDown(r.KEY_S)) { dy = 1; this.facing = 'south' }
    if (r.IsKeyDown(r.KEY_LEFT) || r.IsKeyDown(r.KEY_A)) { dx = -1; this.facing = 'west' }
    if (r.IsKeyDown(r.KEY_RIGHT) || r.IsKeyDown(r.KEY_D)) { dx = 1; this.facing = 'east' }

    const moving = dx !== 0 || dy !== 0
    this.animation = moving ? 'walk' : 'idle'

    return { dx, dy }
  }

  update(time) {
    const frames = this.animations[`${this.animation}:${this.facing}`]
    this.sprite.frame = frames[Math.floor(time * this.speed) % frames.length]
  }

  draw() {
    this.sprite.draw(this.x, this.y, this.scale)
  }

  unload() {
    this.sprite.unload()
  }
}
