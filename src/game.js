// this is an example RPG game-engine.
// edit assets/demo.md to control dialogs and game-flow

import { promises as fs } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { runDialog, getASTInfo } from 'mdif'
import tiled from 'tiled-load'
import r from 'raylib'
import Map from './map.js'

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

// Player is always drawn at screen center; the map scrolls around them
const SCREEN_W = 320
const SCREEN_H = 240
const MOVE_SPEED = 80 // pixels per second

// World position of the player (in map pixels)
let worldX = 160
let worldY = 120

const player = new Player({
  name: 'char1',
  x: SCREEN_W / 2,
  y: SCREEN_H / 2,
  animation: 'idle',
  facing: 'south',
  speed: 10
})

const mapData = await tiled(basename(info.map), dirname(resolve(dirname(fname), info.map)) + '/', (f) => fs.readFile(f, 'utf8'))
const map = new Map(mapData, {})

const mapPixelW = mapData.width * mapData.tilewidth
const mapPixelH = mapData.height * mapData.tileheight

while (!r.WindowShouldClose()) {
  const dt = r.GetFrameTime()
  const { dx, dy } = player.input(r)

  // Move world position, clamped to map bounds
  worldX = Math.max(0, Math.min(mapPixelW, worldX + dx * MOVE_SPEED * dt))
  worldY = Math.max(0, Math.min(mapPixelH, worldY + dy * MOVE_SPEED * dt))

  // Map offset so the player appears centered
  map.x = Math.round(SCREEN_W / 2 - worldX)
  map.y = Math.round(SCREEN_H / 2 - worldY)

  player.update(r.GetTime())
  r.BeginDrawing()
  map.draw()
  player.draw()
  r.EndDrawing()
}

r.CloseWindow()
