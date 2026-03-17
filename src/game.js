// this is an example RPG game-engine.
// edit assets/game.md to control dialogs and game-flow

import { promises as fs } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import createDialog from './mdif.js'
import { initDialog, drawDialog } from './dialog.js'
import tiled from 'tiled-load'
import r from 'raylib'
import Map from './map.js'
import Player from './player.js'
import { buildCollisionPolygons, isColliding } from './collision.js'

const [, program, fname] = process.argv

if (!fname) {
  console.error(`Usage: ${basename(program)} <FNAME>`)
  console.error('Where <FNAME> is the name of your markdown entry-point.')
  process.exit(1)
}

const dialog = createDialog(await fs.readFile(fname, 'utf8'))

if (!dialog.info.map) {
  throw new Error('map not set in frontmatter of game.')
}

// --- dialog callbacks -------------------------------------------------------

// Default choice handler: END closes, #id reopens that section
dialog.onChoice = (choice) => {
  if (choice.url === 'END') {
    dialog.close()
  } else {
    dialog.open(choice.url.replace(/^#/, ''))
  }
}

// --- setup ------------------------------------------------------------------

r.InitWindow(320, 240, 'node-raylib rpg')
r.SetTargetFPS(60)
initDialog('assets/ninepatch.png')

const SCREEN_W = 320
const SCREEN_H = 240

let worldX = 160
let worldY = 120

const player = new Player({
  name: 'char1',
  x: SCREEN_W / 2,
  y: SCREEN_H / 2,
  animation: 'idle',
  facing: 'south'
})

const mapData = await tiled(basename(dialog.info.map), dirname(resolve(dirname(fname), dialog.info.map)) + '/', (f) => fs.readFile(f, 'utf8'))
const map = new Map(mapData, {})
const collisionPolygons = buildCollisionPolygons(mapData)

const mapPixelW = mapData.width * mapData.tilewidth
const mapPixelH = mapData.height * mapData.tileheight

// For demo: open the first dialog section automatically (press E to open it)
// In a real game you'd call dialog.open('test') when the player touches an NPC.
let menuIndex = 0

// Key edge-detection helpers
let prevZ = false
let prevX = false
let prevE = false
let prevUp = false
let prevDown = false

// --- main loop --------------------------------------------------------------

while (!r.WindowShouldClose()) {
  const dt = r.GetFrameTime()

  // --- input (edge detection) -----------------------------------------------
  const curZ = r.IsKeyDown(r.KEY_Z)
  const curX = r.IsKeyDown(r.KEY_X)
  const curE = r.IsKeyDown(r.KEY_E)
  const curUp = r.IsKeyDown(r.KEY_UP)
  const curDown = r.IsKeyDown(r.KEY_DOWN)

  const pressedZ = curZ && !prevZ
  const pressedX = curX && !prevX
  const pressedE = curE && !prevE
  const pressedUp = curUp && !prevUp
  const pressedDown = curDown && !prevDown

  prevZ = curZ
  prevX = curX
  prevE = curE
  prevUp = curUp
  prevDown = curDown

  // --- dialog input ---------------------------------------------------------

  if (!dialog.isOpen && pressedE) {
    // E key triggers the demo dialog
    menuIndex = 0
    dialog.open('test')
  }

  if (dialog.isOpen) {
    if (dialog.choices.length > 0) {
      // Menu navigation
      if (pressedUp) menuIndex = (menuIndex - 1 + dialog.choices.length) % dialog.choices.length
      if (pressedDown) menuIndex = (menuIndex + 1) % dialog.choices.length
      if (pressedZ || pressedX) {
        dialog.choose(menuIndex)
        menuIndex = 0
      }
    } else {
      // Advance dialog line
      if (pressedZ || pressedX) dialog.advance()
    }
  }

  // --- player movement (blocked while dialog is open) -----------------------

  if (!dialog.isOpen) {
    const { dx, dy } = player.input(r)

    const nextX = Math.max(0, Math.min(mapPixelW, worldX + dx * player.moveSpeed * dt))
    const nextY = Math.max(0, Math.min(mapPixelH, worldY + dy * player.moveSpeed * dt))

    const feetY = worldY + player.feetY
    const nextFeetY = nextY + player.feetY
    const colX = isColliding(nextX - player.feetW, feetY, collisionPolygons) || isColliding(nextX + player.feetW, feetY, collisionPolygons)
    const colY = isColliding(worldX - player.feetW, nextFeetY, collisionPolygons) || isColliding(worldX + player.feetW, nextFeetY, collisionPolygons)
    if (!colX) worldX = nextX
    if (!colY) worldY = nextY
  }

  // --- map offset -----------------------------------------------------------

  map.x = Math.round(SCREEN_W / 2 - worldX)
  map.y = Math.round(SCREEN_H / 2 - worldY)

  player.update(r.GetTime())

  // --- draw -----------------------------------------------------------------

  r.BeginDrawing()
  map.draw()
  player.draw()
  drawDialog(dialog, SCREEN_W, SCREEN_H, menuIndex)
  if (!dialog.isOpen) {
    r.DrawText('[E] talk', 4, 4, 10, r.GRAY)
  }
  r.EndDrawing()
}

r.CloseWindow()
