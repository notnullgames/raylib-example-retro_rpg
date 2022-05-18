// I just used this to test sprite, map, dialog, while I was building things

import r from 'raylib'
import tiled from 'tiled-load'

import Player from './player.js'
import Map from './map.js'

r.InitWindow(320, 240, 'node-raylib rpg')
r.SetTargetFPS(60)

let animation = 0
const animations = ['walk', 'magic', 'thrust', 'pull', 'bow', 'die']

const chars = [1, 2, 3, 4, 5, 6].map(c => new Player({
  name: 'char' + c,
  x: 160,
  y: 120,
  animation: 'idle',
  facing: 'south',
  speed: 10
}))

let currentPlayer = 0
let player = chars[currentPlayer]

const map = new Map(await tiled('demo.tmj', './assets/'), {
  x: 0,
  y: 0
})

while (!r.WindowShouldClose()) {
  let walking = false

  if (currentPlayer >= chars.length) {
    currentPlayer = 0
  }

  if (currentPlayer < 0) {
    currentPlayer = chars.length - 1
  }

  player = chars[currentPlayer]

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

  if (r.IsKeyPressed(r.KEY_V)) {
    currentPlayer++
  }

  if (r.IsKeyPressed(r.KEY_C)) {
    currentPlayer--
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
  map.draw()
  player.draw()
  r.DrawText(`Press arrows to trigger animations,\nC/V to chnage character: char${currentPlayer+1}.\nZ/X to change animation: ${animations[animation]}`, 10, 10, 10, r.WHITE)
  r.EndDrawing()
}

player.unload()
map.unload()
r.CloseWindow()
