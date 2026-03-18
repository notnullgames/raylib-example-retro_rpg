// Object handler: class=enemy
//
// An NPC that optionally chases the player and damages them on contact.
// The player can attack it by pressing X nearby, which plays a one-shot
// "magic" animation and subtracts 1 HP. At 0 HP the enemy is removed.
//
// Tiled properties:
//   sprite               (string)  sprite name under assets/, default "char1"
//   move_towards_player  (bool)    whether to chase the player each frame
//   speed                (int)     world px/s when chasing
//   damage               (int)     HP subtracted per player hit
//   hp                   (int)     enemy hit points

import Player from '../player.js'
import { isColliding } from '../collision.js'

const KNOCKBACK_FRICTION = 10 // exponential decay multiplier
const TOUCH_RADIUS = 14 // live body radius, world px
const DEAD_TOUCH_W = 28 // dead body half-width (px)
const DEAD_TOUCH_H = 20 // dead body half-height (px)
const NEAR_RADIUS = 48 // activate range (enemies don't activate, but kept for interface compat)

// Seconds of invincibility the enemy grants the player after a hit
const HIT_COOLDOWN = 1.0

export default class EnemyObject {
  constructor(obj, ctx) {
    this.ctx = ctx
    this.worldX = obj.x + obj.width / 2
    this.worldY = obj.y - obj.height / 2

    this.moveTowardsPlayer = obj.props.move_towards_player ?? false
    this.speed = obj.props.speed ?? 40
    this.damage = obj.props.damage ?? 1
    this.hp = obj.props.hp ?? 3
    this.dialogDead = obj.props.dialog_dead ?? null
    this.dead = false

    this._knockbackVx = 0
    this._knockbackVy = 0

    // Per-enemy hit cooldown timer (so one enemy can only damage once per cooldown window)
    this._hitTimer = 0

    // Die animation timer; >0 means death animation playing
    this._dieTimer = 0

    const spriteName = obj.props.sprite ?? 'char1'
    this.npc = new Player({
      name: spriteName,
      x: 0,
      y: 0,
      animation: 'idle',
      facing: 'south'
    })
  }

  update(time, dt, collisionPolygons) {
    // Frozen on last die frame — stay visible forever, do nothing else
    if (this.dead) return

    // Tick die animation; freeze on last frame when done
    if (this._dieTimer > 0) {
      this._dieTimer -= dt
      const frames = this.npc.animations[`die:${this.npc.facing}`]
      if (this._dieTimer <= 0) {
        // Pin to the last frame and stop
        this.npc.sprite.frame = frames[frames.length - 1]
        this.dead = true
        return
      }
      // Drive frame from local elapsed time so it always starts at frame 0
      const elapsed = this._dieStart - this._dieTimer
      this.npc.sprite.frame = frames[Math.min(Math.floor(elapsed * this.npc.speed), frames.length - 1)]
      return
    }

    // Chase the player
    if (this.moveTowardsPlayer) {
      const { worldX: px, worldY: py } = this.ctx
      const dx = px - this.worldX
      const dy = py - this.worldY
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > TOUCH_RADIUS + 2) {
        const nx = dx / dist
        const ny = dy / dist

        const nextX = this.worldX + nx * this.speed * dt
        const nextY = this.worldY + ny * this.speed * dt

        // Update facing
        if (Math.abs(dx) > Math.abs(dy)) {
          this.npc.facing = dx > 0 ? 'east' : 'west'
        } else {
          this.npc.facing = dy > 0 ? 'south' : 'north'
        }
        this.npc.animation = 'walk'

        // Slide along walls using same two-probe pattern as player
        const feetW = this.npc.feetW
        const feetY = this.npc.feetY
        const curFeetY = this.worldY + feetY

        const colX = isColliding(nextX - feetW, curFeetY, collisionPolygons) || isColliding(nextX + feetW, curFeetY, collisionPolygons)
        const colY = isColliding(this.worldX - feetW, nextY + feetY, collisionPolygons) || isColliding(this.worldX + feetW, nextY + feetY, collisionPolygons)

        if (!colX) this.worldX = nextX
        if (!colY) this.worldY = nextY
      } else {
        this.npc.animation = 'idle'
      }
    }

    // Apply and decay knockback
    this._knockbackVx *= Math.max(0, 1 - KNOCKBACK_FRICTION * dt)
    this._knockbackVy *= Math.max(0, 1 - KNOCKBACK_FRICTION * dt)
    if (this._knockbackVx !== 0 || this._knockbackVy !== 0) {
      const kx = this.worldX + this._knockbackVx * dt
      const ky = this.worldY + this._knockbackVy * dt
      const feetW = this.npc.feetW
      const feetY = this.npc.feetY
      const colX = isColliding(kx - feetW, this.worldY + feetY, collisionPolygons) || isColliding(kx + feetW, this.worldY + feetY, collisionPolygons)
      const colY = isColliding(this.worldX - feetW, ky + feetY, collisionPolygons) || isColliding(this.worldX + feetW, ky + feetY, collisionPolygons)
      if (!colX) this.worldX = kx
      if (!colY) this.worldY = ky
    }

    // Tick hit cooldown
    if (this._hitTimer > 0) this._hitTimer -= dt

    this.npc.update(time)
  }

  draw(mapX, mapY) {
    this.npc.x = this.worldX + mapX
    this.npc.y = this.worldY + mapY
    this.npc.draw()
  }

  /**
   * Solid body collision — blocks the player from walking through.
   */
  touching(px, py, feetW, feetY) {
    if (this._dieTimer > 0) return false
    const playerFeetY = py + feetY
    if (this.dead) {
      // AABB over the prone sprite
      for (const fx of [px - feetW, px + feetW]) {
        if (fx >= this.worldX - DEAD_TOUCH_W && fx <= this.worldX + DEAD_TOUCH_W && playerFeetY >= this.worldY - DEAD_TOUCH_H && playerFeetY <= this.worldY + DEAD_TOUCH_H) return true
      }
      return false
    }
    // Live: circle at feet
    for (const fx of [px - feetW, px + feetW]) {
      const dx = fx - this.worldX
      const dy = playerFeetY - (this.worldY + this.npc.feetY)
      if (dx * dx + dy * dy < TOUCH_RADIUS * TOUCH_RADIUS) return true
    }
    return false
  }

  near(px, py) {
    if (this._dieTimer > 0) return false
    // Dead enemies are still near-able if they have a dialog_dead
    if (this.dead && !this.dialogDead) return false
    const dx = px - this.worldX
    const dy = py - this.worldY
    return dx * dx + dy * dy <= NEAR_RADIUS * NEAR_RADIUS
  }

  /**
   * Called each frame by game.js when the player is touching this enemy.
   * Applies damage to ctx.hp if the hit cooldown has expired.
   */
  applyKnockback(vx, vy) {
    this._knockbackVx = vx
    this._knockbackVy = vy
  }

  tryDamage() {
    if (this._hitTimer > 0) return
    this.ctx.hp = Math.max(0, this.ctx.hp - this.damage)
    this._hitTimer = HIT_COOLDOWN
  }

  /**
   * Player attacks this enemy: subtract 1 HP, play one-shot magic animation.
   * Returns true so the engine knows the activation was consumed.
   */
  activate() {
    if (this._dieTimer > 0) return false
    // Dead: open dialog_dead if set
    if (this.dead) {
      if (!this.dialogDead || this.ctx.dialog.isOpen) return false
      this.ctx.dialog.open(this.dialogDead)
      return true
    }
    // Alive: take damage
    this.hp -= 1
    if (this.hp <= 0) {
      // Play die animation then freeze on last frame
      const frames = this.npc.animations[`die:${this.npc.facing}`]
      this._dieTimer = frames.length / this.npc.speed
      this._dieStart = this._dieTimer
      this.npc.animation = 'die'
    }
    return true
  }

  unload() {
    this.npc?.sprite?.unload()
  }
}
