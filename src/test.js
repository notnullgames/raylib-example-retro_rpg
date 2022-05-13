// I just used this to test sprite, map, dialog, while I was building things

import r from 'raylib'

import Player from './player.js'

r.InitWindow(320, 240, 'node-raylib rpg')
r.SetTargetFPS(60)

let animation = 0
const animations = ['walk', 'magic', 'thrust', 'pull', 'bow', 'die']

const player = new Player({
  name: 'char6',
  x: 160,
  y: 120,
  animation: 'idle',
  facing: 'south',
  speed: 10
})

while (!r.WindowShouldClose()) {
  let walking = false

  if (r.IsKeyDown(r.KEY_UP)) {
    player.facing = 'north'
    walking = true
  }

  if (r.IsKeyDown(r.KEY_DOWN)) {
    player.facing = 'south'
    walking = true
  }

  if (r.IsKeyDown(r.KEY_LEFT)) {
    player.facing = 'west'
    walking = true
  }

  if (r.IsKeyDown(r.KEY_RIGHT)) {
    player.facing = 'east'
    walking = true
  }

  if (r.IsKeyPressed(r.KEY_X)) {
    animation++
  }

  if (r.IsKeyPressed(r.KEY_Z)) {
    animation--
  }

  if (animation >= animations.length) {
    animation = 0
  }

  if (animation < 0) {
    animation = animations.length - 1
  }

  player.animation = walking ? animations[animation] : 'idle'

  const time = r.GetTime()
  player.update(time)

  r.BeginDrawing()
  r.ClearBackground(r.BLACK)
  player.draw()
  r.DrawText(`Press arrows to trigger animations,\nZ/X to change animation: ${animations[animation]}`, 10, 10, 10, r.WHITE)
  r.EndDrawing()
}

r.CloseWindow()
