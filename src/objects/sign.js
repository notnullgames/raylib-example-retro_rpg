// Object handler: class=sign
//
// Draws the sprite from the Tiled object's gid, and opens a dialog when activated.

import r from 'raylib'

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

    r.DrawTextureRec(
      texture,
      { x: srcX, y: srcY, width: tilewidth, height: tileheight },
      { x: screenX - tilewidth / 2, y: screenY - tileheight / 2 },
      r.WHITE
    )
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
