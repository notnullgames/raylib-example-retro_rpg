// Object handler: class=player
//
// Two behaviours depending on name:
//   name==="player"  → sets the initial world position of the user's player; no draw/activate
//   name!=="player"  → an NPC: draws a Player sprite at the object position,
//                      blocks movement when touched, activates a dialog when nearby

import Player from '../player.js'

// NPC collision: treat the NPC as a circle at its feet center
const TOUCH_RADIUS = 14 // world px — solid body, blocks movement
const NEAR_RADIUS = 48 // world px — "press X to talk" range

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
      x: 0,
      y: 0, // screen position set each draw
      animation: obj.props.animation || 'idle',
      facing: obj.props.facing || 'south'
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
   * Returns true if the player's foot probes overlap this NPC's solid body.
   * @param {number} px     player world-center X
   * @param {number} py     player world-center Y
   * @param {number} feetW  half-width of foot probe
   * @param {number} feetY  y-offset from player center to feet
   */
  touching(px, py, feetW, feetY) {
    if (this.isPlayerSpawn) return false
    // NPC feet center
    const npcFeetY = this.worldY + this.npc.feetY
    // Check left and right foot probes against NPC circle
    for (const fx of [px - feetW, px + feetW]) {
      const dx = fx - this.worldX
      const dy = py + feetY - npcFeetY
      if (dx * dx + dy * dy < TOUCH_RADIUS * TOUCH_RADIUS) return true
    }
    return false
  }

  /**
   * Returns true if the player center is within talking range.
   * @param {number} px  player world-center X
   * @param {number} py  player world-center Y
   */
  near(px, py) {
    if (this.isPlayerSpawn) return false
    const dx = px - this.worldX
    const dy = py - this.worldY
    return dx * dx + dy * dy <= NEAR_RADIUS * NEAR_RADIUS
  }

  /**
   * Called when the player presses the activate key while near.
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
