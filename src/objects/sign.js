// Object handler: class=sign
//
// An invisible trigger at the object's position.
// When the player activates it (presses X nearby), opens the named dialog.

export default class SignObject {
  /**
   * @param {object} obj   Tiled object (with normalised .props plain-object)
   * @param {object} ctx   shared context: { dialog, ... }
   */
  constructor(obj, ctx) {
    this.ctx = ctx
    // Center of the sign in world coords (Tiled y is bottom for GID objects)
    this.worldX = obj.x + obj.width / 2
    this.worldY = obj.y - obj.height / 2
    this.dialogId = obj.props.dialog ?? null
  }

  update(_time) {}

  draw(_mapX, _mapY) {}

  /**
   * Called when the player presses the activate key nearby.
   * Returns true if activation was consumed.
   */
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
