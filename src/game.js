// this is an example RPG game-engine.
// edit assets/game.md to control dialogs and game-flow

import { promises as fs } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import createDialog from './mdif.js'
import { initDialog, drawDialog } from './dialog.js'
import { loadObjects, findNearby } from './objects.js'
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

// worldX/worldY are mutated by the player-spawn object handler, so wrap them
// in a context object that handlers can write to.
const ctx = { worldX: 160, worldY: 120, dialog }

const mapData = await tiled(basename(dialog.info.map), dirname(resolve(dirname(fname), dialog.info.map)) + '/', (f) => fs.readFile(f, 'utf8'))
const map = new Map(mapData, {})
const collisionPolygons = buildCollisionPolygons(mapData)

const mapPixelW = mapData.width * mapData.tilewidth
const mapPixelH = mapData.height * mapData.tileheight

// Load map objects; player spawn object writes initial worldX/worldY into ctx
const objects = await loadObjects(mapData, ctx)

const player = new Player({
  name: 'char1',
  x: SCREEN_W / 2,
  y: SCREEN_H / 2,
  animation: 'idle',
  facing: 'south'
})

let menuIndex = 0

// Key edge-detection helpers
let prevZ = false
let prevX = false
let prevUp = false
let prevDown = false

// --- main loop --------------------------------------------------------------

while (!r.WindowShouldClose()) {
  const dt = r.GetFrameTime()
  const time = r.GetTime()

  // --- input (edge detection) -----------------------------------------------
  const curZ = r.IsKeyDown(r.KEY_Z)
  const curX = r.IsKeyDown(r.KEY_X)
  const curUp = r.IsKeyDown(r.KEY_UP)
  const curDown = r.IsKeyDown(r.KEY_DOWN)

  const pressedZ = curZ && !prevZ
  const pressedX = curX && !prevX
  const pressedUp = curUp && !prevUp
  const pressedDown = curDown && !prevDown

  prevZ = curZ
  prevX = curX
  prevUp = curUp
  prevDown = curDown

  // --- dialog input ---------------------------------------------------------

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
  } else {
    // Activate nearest object when X is pressed
    if (pressedX) {
      const nearby = findNearby(objects, ctx.worldX, ctx.worldY)
      for (const obj of nearby) {
        if (obj.activate()) {
          menuIndex = 0
          break
        }
      }
    }
  }

  // --- player movement (blocked while dialog is open) -----------------------

  if (!dialog.isOpen) {
    const { dx, dy } = player.input(r)

    const nextX = Math.max(0, Math.min(mapPixelW, ctx.worldX + dx * player.moveSpeed * dt))
    const nextY = Math.max(0, Math.min(mapPixelH, ctx.worldY + dy * player.moveSpeed * dt))

    const feetY = ctx.worldY + player.feetY
    const nextFeetY = nextY + player.feetY
    const colX = isColliding(nextX - player.feetW, feetY, collisionPolygons) || isColliding(nextX + player.feetW, feetY, collisionPolygons)
    const colY = isColliding(ctx.worldX - player.feetW, nextFeetY, collisionPolygons) || isColliding(ctx.worldX + player.feetW, nextFeetY, collisionPolygons)
    if (!colX) ctx.worldX = nextX
    if (!colY) ctx.worldY = nextY
  }

  // --- map offset -----------------------------------------------------------

  map.x = Math.round(SCREEN_W / 2 - ctx.worldX)
  map.y = Math.round(SCREEN_H / 2 - ctx.worldY)

  player.update(time)
  for (const obj of objects) obj.update(time)

  // --- draw -----------------------------------------------------------------

  r.BeginDrawing()
  map.draw()
  for (const obj of objects) obj.draw(map.x, map.y)
  player.draw()
  drawDialog(dialog, SCREEN_W, SCREEN_H, menuIndex)
  r.EndDrawing()
}

// cleanup
for (const obj of objects) obj.unload()
r.CloseWindow()
