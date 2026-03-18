// Object handler: class=player
//
// Two behaviours depending on name:
//   name==="player"  → sets the initial world position of the user's player; no draw/activate
//   name!=="player"  → an NPC: draws a Player sprite at the object position,
//                      activates a dialog when the user presses X nearby

import Player from '../player.js'

export default class PlayerObject {
  /**
   * @param {object} obj   Tiled object (with normalised .props plain-object)
   * @param {object} ctx   shared context: { worldX, worldY, dialog, ... }
   */
  constructor(obj, ctx) {
    this.obj = obj
    this.ctx = ctx
    this.isPlayerSpawn = obj.name === 'player'

    if (this.isPlayerSpawn) {
      // Tiled object y is bottom of the sprite; convert to world center
      ctx.worldX = obj.x + obj.width / 2
      ctx.worldY = obj.y - obj.height / 2
      return
    }

    // NPC: create a Player instance parked at the object's world position
    // Tiled y is bottom-left for GID objects, so center vertically
    this.worldX = obj.x + obj.width / 2
    this.worldY = obj.y - obj.height / 2
    this.dialogId = obj.props.dialog ?? null

    const spriteName = obj.props.sprite ?? 'char1'
    this.npc = new Player({
      name: spriteName,
      x: 0, y: 0,   // screen position set each draw
      animation: 'idle',
      facing: 'south'
    })
  }

  update(time) {
    if (this.isPlayerSpawn) return
    this.npc.update(time)
  }

  /**
   * @param {number} mapX   current map x-offset (map.x)
   * @param {number} mapY   current map y-offset (map.y)
   */
  draw(mapX, mapY) {
    if (this.isPlayerSpawn) return
    this.npc.x = this.worldX + mapX
    this.npc.y = this.worldY + mapY
    this.npc.draw()
  }

  /**
   * Called when the player presses the activate key nearby.
   * Returns true if activation was consumed.
   */
  activate() {
    if (this.isPlayerSpawn || !this.dialogId) return false
    const { dialog } = this.ctx
    if (!dialog.isOpen) {
      dialog.open(this.dialogId)
    }
    return true
  }

  unload() {
    if (!this.isPlayerSpawn) this.npc?.sprite?.unload()
  }
}
