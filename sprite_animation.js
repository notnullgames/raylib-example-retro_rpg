// load & display sprites
// loosely based on ideas from https://bedroomcoders.co.uk/sprite-sheets-with-raylib/

import r from 'raylib'

export default class SpriteAnimation {
  constructor (image, { frame = 0, frameSize = { x: 32, y: 32 }, origin = { x: 0, y: 0 } }) {
    this.image = typeof image === 'string' ? r.LoadTexture(image) : image
    this.frameSize = frameSize
    this.frame = frame
    this.origin = origin
    this.framesWide = Math.ceil(this.image.width / this.frameSize.x)
  }

  draw (x, y, scale, angle = 0, color = r.WHITE) {
    const ox = (this.frame % this.framesWide) * this.frameSize.x
    const oy = Math.floor(this.frame / this.framesWide) * this.frameSize.y
    r.DrawTexturePro(
      this.image,
      { x: ox, y: oy, width: this.frameSize.x, height: this.frameSize.y },
      { x, y, width: this.frameSize.x * scale, height: this.frameSize.y * scale },
      { x: this.origin.x * scale, y: this.origin.y * scale },
      angle,
      color
    )
  }
}
