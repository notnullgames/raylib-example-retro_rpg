// Object handler: class=sign
//
// Draws the sprite from the Tiled object's gid, blocks movement through its
// base, and opens a dialog when the player activates it nearby.

import r from 'raylib'

// Sign collision: a narrow rectangle at the post base (bottom of the sprite)
const TOUCH_W = 10  // half-width of solid base, world px
const TOUCH_H = 8   // half-height of solid base, world px
// The post sits at the bottom of the 64px sprite, so offset down from worldY (sprite center)
const TOUCH_Y_OFFSET = 24  // px below worldY to center of collision rect
const NEAR_RADIUS = 48 // world px — "press X to read" range

export default class SignObject {
  /**
   * @param {object} obj   Tiled object (with normalised .props and .tileset)
   * @param {object} ctx   shared context: { dialog, ... }
   */
  constructor(obj, ctx) {
    this.ctx = ctx
    this.dialogId = obj.props.dialog ?? null
    this.tileset = obj.tileset ?? null

    // Tiled y for GID objects is the bottom edge, x is the left edge
    this.worldX = obj.x + obj.width / 2
    this.worldY = obj.y - obj.height / 2
  }

  update(_time) {}

  draw(mapX, mapY) {
    if (!this.tileset) return
    const { texture, tileIndex, tilewidth, tileheight, columns } = this.tileset

    const srcX = (tileIndex % columns) * tilewidth
    const srcY = Math.floor(tileIndex / columns) * tileheight

    const screenX = this.worldX + mapX
    const screenY = this.worldY + mapY

    r.DrawTextureRec(texture, { x: srcX, y: srcY, width: tilewidth, height: tileheight }, { x: screenX - tilewidth / 2, y: screenY - tileheight / 2 }, r.WHITE)
  }

  /**
   * Returns true if the player's foot probes overlap the sign's solid base.
   * @param {number} px     player world-center X
   * @param {number} py     player world-center Y
   * @param {number} feetW  half-width of foot probe
   * @param {number} feetY  y-offset from player center to feet
   */
  touching(px, py, feetW, feetY) {
    const playerFeetY = py + feetY
    const baseY = this.worldY + TOUCH_Y_OFFSET
    // AABB: check if either foot probe point falls inside the post base rect
    for (const fx of [px - feetW, px + feetW]) {
      if (fx >= this.worldX - TOUCH_W && fx <= this.worldX + TOUCH_W && playerFeetY >= baseY - TOUCH_H && playerFeetY <= baseY + TOUCH_H) return true
    }
    return false
  }

  /**
   * Returns true if the player center is within reading range.
   * @param {number} px  player world-center X
   * @param {number} py  player world-center Y
   */
  near(px, py) {
    const dx = px - this.worldX
    const dy = py - this.worldY
    return dx * dx + dy * dy <= NEAR_RADIUS * NEAR_RADIUS
  }

  activate() {
    if (!this.dialogId) return false
    const { dialog } = this.ctx
    if (!dialog.isOpen) {
      dialog.open(this.dialogId)
    }
    return true
  }

  unload() {}
}
