// this is an example RPG game-engine.
// edit assets/demo.md to control dialogs and game-flow

import { promises as fs } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { runDialog, getASTInfo } from 'mdif'
import tiled from 'tiled-load'
import r from 'raylib'

import Player from './player.js'


const [, program, fname] = process.argv

if (!fname) {
  console.error(`Usage: ${basename(program)} <FNAME>`)
  console.error('Where <FNAME> is the name of your markdown entry-point.')
  process.exit(1)
}

const md = await fs.readFile(fname)
const { info } = getASTInfo(md)

if (!info.map) {
  throw new Error('map not set in frontmatter of game.')
}

r.InitWindow(320, 240, 'node-raylib rpg')
r.SetTargetFPS(60)

const map = await tiled(basename(info.map), dirname(resolve(dirname(fname), info.map)) + '/')
const player = new Player({
  name: 'char1',
  x: 160,
  y: 120,
  animation: 'idle',
  facing: 'south',
  speed: 10
})

while (!r.WindowShouldClose()) {
  let walking = false
  
  if (r.IsKeyDown(r.KEY_UP)){
    player.facing = 'north'
    walking = true
  }

  if (r.IsKeyDown(r.KEY_DOWN)){
    player.facing = 'south'
    walking = true
  }

  if (r.IsKeyDown(r.KEY_LEFT)){
    player.facing = 'west'
    walking = true
  }

  if (r.IsKeyDown(r.KEY_RIGHT)){
    player.facing = 'east'
    walking = true
  }

  player.animation = walking ? 'walk' : 'idle'

  const time = r.GetTime()
  player.update(time)
  
  r.BeginDrawing()
  r.ClearBackground(r.BLACK)
  player.draw()
  r.EndDrawing()
}

r.CloseWindow()
