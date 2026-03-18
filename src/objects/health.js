// Object handler: class=health
//
// A pickup that restores HP when the player walks over it.
// If name==="heart" it draws assets/heart.png at the object position.
//
// Tiled properties:
//   value  (int)  HP to restore, default 1

import r from 'raylib'

const PICKUP_RADIUS = 20 // world px — how close the player must be to collect

let _heartTexture = null

export default class HealthObject {
  constructor(obj, ctx) {
    this.ctx = ctx
    this.worldX = obj.x + obj.width / 2
    this.worldY = obj.y - obj.height / 2
    this.value = obj.props.value ?? 1
    this.isHeart = obj.name === 'heart'
    this.collected = false

    // Load heart texture once (cached across instances via module-level var)
    if (this.isHeart && !_heartTexture) {
      _heartTexture = r.LoadTexture('assets/heart.png')
    }
  }

  update(_time, _dt, _collisionPolygons) {
    if (this.collected) return
    const dx = this.ctx.worldX - this.worldX
    const dy = this.ctx.worldY - this.worldY
    if (dx * dx + dy * dy <= PICKUP_RADIUS * PICKUP_RADIUS) {
      this.ctx.hp = Math.min(this.ctx.maxHp, this.ctx.hp + this.value)
      this.collected = true
    }
  }

  draw(mapX, mapY) {
    if (this.collected) return
    if (this.isHeart && _heartTexture) {
      const size = 16
      const screenX = this.worldX + mapX - size / 2
      const screenY = this.worldY + mapY - size / 2
      r.DrawTextureEx(_heartTexture, { x: screenX, y: screenY }, 0, size / _heartTexture.width, r.WHITE)
    }
  }

  touching(_px, _py, _feetW, _feetY) {
    return false
  }
  near(_px, _py) {
    return false
  }
  activate() {
    return false
  }
  unload() {}
}
