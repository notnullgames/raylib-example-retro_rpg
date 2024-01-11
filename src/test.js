// I just used this to test sprite, map, dialog, while I was building things

import { promises as fs } from 'fs'
import r from 'raylib'
import tiled from 'tiled-load'

import Player from './player.js'
import Map from './map.js'
import Dialog from './dialog.js'

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

let currentPlayer = 4
let player = chars[currentPlayer]

const map = new Map(await tiled('demo.tmj', './assets/', f => fs.readFile(f, 'utf8')), {
  x: 0,
  y: 0
})

const md = (await fs.readFile('assets/game.md')).toString()
const dialog = new Dialog(md)
let dnum = 0
dialog.set('test', dnum)
dialog.open = true

while (!r.WindowShouldClose()) {
  let walking = false

  if (currentPlayer >= chars.length) {
    currentPlayer = 0
  }

  if (currentPlayer < 0) {
    currentPlayer = chars.length - 1
  }

  player = chars[currentPlayer]

  if (!dialog.open) {
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
  } else {
    if (dialog.state.ending === 'more' && r.IsKeyPressed(r.KEY_X)) {
      dnum++
      dialog.set('test', dnum)
    }
    if (dialog.state.ending === 'prompt') {
      if (r.IsKeyPressed(r.KEY_X)) {
        const next = dialog.state.menu[dialog.currentOption].dialog.replace(/^#/, '')
        dnum = 0
        dialog.set(next, dnum)
      }
      if (r.IsKeyPressed(r.KEY_UP)) {
        dialog.currentOption--
      }
      if (r.IsKeyPressed(r.KEY_DOWN)) {
        dialog.currentOption++
      }
      if (dialog.currentOption < 0) {
        dialog.currentOption = dialog.state.menu.length - 1
      }
      if (dialog.currentOption >= dialog.state.menu.length) {
        dialog.currentOption = 0
      }
    }
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
  dialog.draw()
  r.DrawText(`char${currentPlayer + 1}.\nanimation: ${animations[animation]}`, 10, 10, 10, r.WHITE)
  r.EndDrawing()
}

player.unload()
map.unload()
r.CloseWindow()
