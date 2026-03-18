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

dialog.onChoice = (choice) => {
  if (choice.url === 'END') {
    dialog.close()
  } else {
    dialog.open(choice.url.replace(/^#/, ''))
  }
}

// --- one-time setup ---------------------------------------------------------

r.InitWindow(320, 240, 'node-raylib rpg')
r.SetTargetFPS(60)
initDialog('assets/ninepatch.png')

const SCREEN_W = 320
const SCREEN_H = 240
const MAX_HP = 5
const HEART_SIZE = 16
const HEART_PAD = 2
const KNOCKBACK_IMPULSE = 120
const KNOCKBACK_FRICTION = 10

const mapData = await tiled(basename(dialog.info.map), dirname(resolve(dirname(fname), dialog.info.map)) + '/', (f) => fs.readFile(f, 'utf8'))
const map = new Map(mapData, {})
const collisionPolygons = buildCollisionPolygons(mapData)
const mapPixelW = mapData.width * mapData.tilewidth
const mapPixelH = mapData.height * mapData.tileheight
const heartTexture = r.LoadTexture('assets/heart.png')

// --- resettable state -------------------------------------------------------

// ctx is mutated by object handlers and reset() — keep the same object reference
// so handlers that captured it in their constructor still see updates.
const ctx = { worldX: 160, worldY: 120, dialog, hp: MAX_HP, maxHp: MAX_HP, knockbackVx: 0, knockbackVy: 0 }

let player, objects
let menuIndex, _attackTimer, _dieTimer, _dieStart, gameOver

async function reset() {
  // Unload previous object sprites
  if (objects) for (const obj of objects) obj.unload()

  // Reset ctx in-place (handlers hold a reference to this object)
  ctx.worldX = 160
  ctx.worldY = 120
  ctx.hp = MAX_HP
  ctx.knockbackVx = 0
  ctx.knockbackVy = 0

  // Close any open dialog
  if (dialog.isOpen) dialog.close()

  // Reload objects (re-reads initial positions, resets enemy HP, health pickups, etc.)
  objects = await loadObjects(mapData, ctx)

  // Player spawn object writes the correct worldX/worldY into ctx
  player = new Player({
    name: 'char1',
    x: SCREEN_W / 2,
    y: SCREEN_H / 2,
    animation: 'idle',
    facing: 'south'
  })

  menuIndex = 0
  _attackTimer = 0
  _dieTimer = 0
  _dieStart = 0
  gameOver = false
}

await reset()

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

  // --- game over state ------------------------------------------------------

  if (gameOver) {
    if (_dieTimer > 0) {
      _dieTimer -= dt
      const frames = player.animations[`die:${player.facing}`]
      if (_dieTimer <= 0) {
        player.sprite.frame = frames[frames.length - 1]
      } else {
        const elapsed = _dieStart - _dieTimer
        player.sprite.frame = frames[Math.min(Math.floor(elapsed * player.speed), frames.length - 1)]
      }
    } else if (pressedZ || pressedX) {
      await reset()
    }
  } else {
    // --- dialog input -------------------------------------------------------

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
      if (pressedX) {
        for (const obj of objects) {
          if (obj.near?.(ctx.worldX, ctx.worldY) && obj.activate()) {
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

    // --- player movement (blocked while dialog is open) ---------------------

    if (!dialog.isOpen) {
      const { dx, dy } = player.input(r)
      if (_attackTimer > 0) player.animation = 'magic'

      ctx.knockbackVx *= Math.max(0, 1 - KNOCKBACK_FRICTION * dt)
      ctx.knockbackVy *= Math.max(0, 1 - KNOCKBACK_FRICTION * dt)

      const nextX = Math.max(0, Math.min(mapPixelW, ctx.worldX + (dx * player.moveSpeed + ctx.knockbackVx) * dt))
      const nextY = Math.max(0, Math.min(mapPixelH, ctx.worldY + (dy * player.moveSpeed + ctx.knockbackVy) * dt))

      const feetY = ctx.worldY + player.feetY
      const nextFeetY = nextY + player.feetY

      const tileColX = isColliding(nextX - player.feetW, feetY, collisionPolygons) || isColliding(nextX + player.feetW, feetY, collisionPolygons)
      const tileColY = isColliding(ctx.worldX - player.feetW, nextFeetY, collisionPolygons) || isColliding(ctx.worldX + player.feetW, nextFeetY, collisionPolygons)

      const solidObjects = objects.filter((o) => !o.tryDamage || o.dead)
      const objColX = solidObjects.some((o) => o.touching?.(nextX, ctx.worldY, player.feetW, player.feetY))
      const objColY = solidObjects.some((o) => o.touching?.(ctx.worldX, nextY, player.feetW, player.feetY))

      if (!tileColX && !objColX) ctx.worldX = nextX
      if (!tileColY && !objColY) ctx.worldY = nextY
    }

    // --- update objects -----------------------------------------------------

    for (const obj of objects) {
      obj.update(time, dt, collisionPolygons)
      if (obj.tryDamage && obj.touching?.(ctx.worldX, ctx.worldY, player.feetW, player.feetY)) {
        const prevHp = ctx.hp
        obj.tryDamage()
        if (ctx.hp < prevHp) {
          const dx = ctx.worldX - obj.worldX
          const dy = ctx.worldY - obj.worldY
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const nx = dx / dist
          const ny = dy / dist
          ctx.knockbackVx = nx * KNOCKBACK_IMPULSE
          ctx.knockbackVy = ny * KNOCKBACK_IMPULSE
          obj.applyKnockback(-nx * KNOCKBACK_IMPULSE, -ny * KNOCKBACK_IMPULSE)
          if (ctx.hp <= 0) {
            gameOver = true
            const frames = player.animations[`die:${player.facing}`]
            _dieTimer = frames.length / player.speed
            _dieStart = _dieTimer
            player.animation = 'die'
          }
        }
      }
    }

    if (_attackTimer > 0) {
      _attackTimer -= dt
      if (_attackTimer <= 0) player.animation = 'idle'
    }

    player.update(time)
  }

  // --- map offset -----------------------------------------------------------

  map.x = Math.round(SCREEN_W / 2 - ctx.worldX)
  map.y = Math.round(SCREEN_H / 2 - ctx.worldY)

  // --- draw -----------------------------------------------------------------

  r.BeginDrawing()
  map.draw()

  const drawables = [{ worldY: ctx.worldY, draw: () => player.draw() }, ...objects.filter((o) => o.worldY !== undefined).map((o) => ({ worldY: o.worldY, draw: () => o.draw(map.x, map.y) }))]
  drawables.sort((a, b) => a.worldY - b.worldY)
  for (const d of drawables) d.draw()

  // HUD: hearts
  for (let i = 0; i < ctx.maxHp; i++) {
    const color = i < ctx.hp ? r.WHITE : r.Fade(r.WHITE, 0.25)
    r.DrawTextureEx(heartTexture, { x: HEART_PAD + i * (HEART_SIZE + HEART_PAD), y: HEART_PAD }, 0, HEART_SIZE / heartTexture.width, color)
  }

  if (!gameOver) drawDialog(dialog, SCREEN_W, SCREEN_H, menuIndex)

  // Game over overlay (shown after die animation completes)
  if (gameOver && _dieTimer <= 0) {
    r.DrawRectangle(0, 0, SCREEN_W, SCREEN_H, r.Fade(r.BLACK, 0.6))
    const msg1 = 'GAME OVER'
    const msg2 = 'Press Z to restart'
    r.DrawText(msg1, (SCREEN_W - r.MeasureText(msg1, 20)) / 2, SCREEN_H / 2 - 18, 20, r.WHITE)
    r.DrawText(msg2, (SCREEN_W - r.MeasureText(msg2, 10)) / 2, SCREEN_H / 2 + 10, 10, r.GRAY)
  }

  r.EndDrawing()
}

// cleanup
for (const obj of objects) obj.unload()
r.UnloadTexture(heartTexture)
r.CloseWindow()
