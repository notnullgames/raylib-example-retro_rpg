// this is an example RPG game-engine.
// edit assets/game.md to control dialogs and game-flow

import { promises as fs } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import createDialog from './mdif.js'
import { initDialog, drawDialog } from './dialog.js'
import { loadObjects } from './objects.js'
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

const MAX_HP = 5
const HEART_SIZE = 16 // draw hearts at half their 32px native size
const HEART_PAD = 2

// ctx is shared with all object handlers
const ctx = { worldX: 160, worldY: 120, dialog, hp: MAX_HP, maxHp: MAX_HP, knockbackVx: 0, knockbackVy: 0 }

const KNOCKBACK_IMPULSE = 120 // world px/s initial velocity
const KNOCKBACK_FRICTION = 10 // multiplier for exponential decay

const mapData = await tiled(basename(dialog.info.map), dirname(resolve(dirname(fname), dialog.info.map)) + '/', (f) => fs.readFile(f, 'utf8'))
const map = new Map(mapData, {})
const collisionPolygons = buildCollisionPolygons(mapData)

const mapPixelW = mapData.width * mapData.tilewidth
const mapPixelH = mapData.height * mapData.tileheight

// Load map objects; player-spawn object writes initial worldX/worldY into ctx
const objects = await loadObjects(mapData, ctx)

const player = new Player({
  name: 'char1',
  x: SCREEN_W / 2,
  y: SCREEN_H / 2,
  animation: 'idle',
  facing: 'south'
})

// Load heart texture after InitWindow
const heartTexture = r.LoadTexture('assets/heart.png')

let menuIndex = 0

// One-shot attack animation timer for the player
let _attackTimer = 0

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
      if (pressedUp) menuIndex = (menuIndex - 1 + dialog.choices.length) % dialog.choices.length
      if (pressedDown) menuIndex = (menuIndex + 1) % dialog.choices.length
      if (pressedZ || pressedX) {
        dialog.choose(menuIndex)
        menuIndex = 0
      }
    } else {
      if (pressedZ || pressedX) dialog.advance()
    }
  } else {
    // Activate a nearby object when X is pressed
    if (pressedX) {
      for (const obj of objects) {
        if (obj.near?.(ctx.worldX, ctx.worldY) && obj.activate()) {
          // If it was an enemy (has tryDamage), play the player's magic animation
          if (obj.tryDamage) {
            const frames = player.animations[`magic:${player.facing}`]
            _attackTimer = frames.length / player.speed
            player.animation = 'magic'
          } else {
            menuIndex = 0
          }
          break
        }
      }
    }
  }

  // --- player movement (blocked while dialog is open) -----------------------

  if (!dialog.isOpen) {
    const { dx, dy } = player.input(r)
    // input() overwrites animation every frame; restore attack anim if still active
    if (_attackTimer > 0) player.animation = 'magic'

    // Decay knockback velocity
    ctx.knockbackVx *= Math.max(0, 1 - KNOCKBACK_FRICTION * dt)
    ctx.knockbackVy *= Math.max(0, 1 - KNOCKBACK_FRICTION * dt)

    const nextX = Math.max(0, Math.min(mapPixelW, ctx.worldX + (dx * player.moveSpeed + ctx.knockbackVx) * dt))
    const nextY = Math.max(0, Math.min(mapPixelH, ctx.worldY + (dy * player.moveSpeed + ctx.knockbackVy) * dt))

    const feetY = ctx.worldY + player.feetY
    const nextFeetY = nextY + player.feetY

    // Tile-based collision
    const tileColX = isColliding(nextX - player.feetW, feetY, collisionPolygons) || isColliding(nextX + player.feetW, feetY, collisionPolygons)
    const tileColY = isColliding(ctx.worldX - player.feetW, nextFeetY, collisionPolygons) || isColliding(ctx.worldX + player.feetW, nextFeetY, collisionPolygons)

    // Object-based collision — live enemies are non-solid (damage only), dead ones block
    const solidObjects = objects.filter((o) => !o.tryDamage || o.dead)
    const objColX = solidObjects.some((o) => o.touching?.(nextX, ctx.worldY, player.feetW, player.feetY))
    const objColY = solidObjects.some((o) => o.touching?.(ctx.worldX, nextY, player.feetW, player.feetY))

    if (!tileColX && !objColX) ctx.worldX = nextX
    if (!tileColY && !objColY) ctx.worldY = nextY
  }

  // --- update objects -------------------------------------------------------

  for (const obj of objects) {
    obj.update(time, dt, collisionPolygons)
    // Enemies that are touching the player deal damage + mutual knockback
    if (obj.tryDamage && obj.touching?.(ctx.worldX, ctx.worldY, player.feetW, player.feetY)) {
      const prevHp = ctx.hp
      obj.tryDamage()
      if (ctx.hp < prevHp) {
        // Direction from enemy to player
        const dx = ctx.worldX - obj.worldX
        const dy = ctx.worldY - obj.worldY
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const nx = dx / dist
        const ny = dy / dist
        // Player knocked away from enemy
        ctx.knockbackVx = nx * KNOCKBACK_IMPULSE
        ctx.knockbackVy = ny * KNOCKBACK_IMPULSE
        // Enemy knocked away from player
        obj.applyKnockback(-nx * KNOCKBACK_IMPULSE, -ny * KNOCKBACK_IMPULSE)
      }
    }
  }

  // Tick player attack animation
  if (_attackTimer > 0) {
    _attackTimer -= dt
    if (_attackTimer <= 0) player.animation = 'idle'
  }

  player.update(time)

  // --- map offset -----------------------------------------------------------

  map.x = Math.round(SCREEN_W / 2 - ctx.worldX)
  map.y = Math.round(SCREEN_H / 2 - ctx.worldY)

  // --- draw -----------------------------------------------------------------

  r.BeginDrawing()
  map.draw()

  // Y-sorted draw: player + all drawable objects, back-to-front by world Y
  const drawables = [{ worldY: ctx.worldY, draw: () => player.draw() }, ...objects.filter((o) => o.worldY !== undefined).map((o) => ({ worldY: o.worldY, draw: () => o.draw(map.x, map.y) }))]
  drawables.sort((a, b) => a.worldY - b.worldY)
  for (const d of drawables) d.draw()

  // --- HUD: hearts ----------------------------------------------------------

  for (let i = 0; i < ctx.maxHp; i++) {
    const color = i < ctx.hp ? r.WHITE : r.Fade(r.WHITE, 0.25)
    r.DrawTextureEx(heartTexture, { x: HEART_PAD + i * (HEART_SIZE + HEART_PAD), y: HEART_PAD }, 0, HEART_SIZE / heartTexture.width, color)
  }

  drawDialog(dialog, SCREEN_W, SCREEN_H, menuIndex)
  r.EndDrawing()
}

// cleanup
for (const obj of objects) obj.unload()
r.UnloadTexture(heartTexture)
r.CloseWindow()
