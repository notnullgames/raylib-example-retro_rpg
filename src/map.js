// manage a tiled map in node-raylib

import r from 'raylib'

function colorFromTiled (color) {
  const r = parseInt(color.substr(1, 2), 16)
  const g = parseInt(color.substr(3, 2), 16)
  const b = parseInt(color.substr(5, 2), 16)
  return { r, g, b, a: 255 }
}

export default class Map {
  constructor (map, { x = 0, y = 0, tint = r.WHITE }) {
    this.x = x
    this.y = y
    this.map = map
    this.tint = tint
    this.bgcolor = colorFromTiled(this.map.backgroundcolor)
    // preload images
    for (const ts of this.map.tilesets) {
      if (!ts.resource_image) {
        ts.resource_image = r.LoadImage(ts.image)
      }
    }
  }

  // get the x/y cordinates for top-left corner of tile
  coordinatesFor (gid) {
    const x = (gid % this.map.width) * this.map.tilewidth
    const row = Math.floor(gid / this.map.width)
    const y = this.map.tileheight * row
    return { x, y }
  }

  drawObjects (layer, posX, posY) {}

  drawImage (layer, posX, posY) {}

  drawTiles (layer, posX, posY) {
    const newTint = r.ColorAlpha(this.tint, layer.opacity)
    switch (this.map.renderorder) {
      case 'right-down':
        for (let y = 0; y < this.map.height; y++) {
          for (let x = 0; x < this.map.width; x++) {
            const gid = layer.data[(y * this.map.width) + x]
            const ts = this.map.tilesets[this.map.tiles[gid]]
            if (typeof ts !== 'undefined') {
              const srcRect = { ...this.coordinatesFor(gid), width: this.map.tilewidth, height: this.map.tileheight }
              const position = { x: posX + (x * this.map.tilewidth), y: posY + (y * this.map.tileheight) }
              if (ts.resource_image) {
                r.DrawTextureRec(ts.resource_image, srcRect, position, newTint)
              }
            }
          }
        }
        break
    }
  }

  drawLayer (layer, posX, posY) {
    switch (layer.type) {
      case 'group':
        return this.drawLayers(layer.layers, posX + layer.x, posY + layer.y)
      case 'objectgroup':
        return this.drawObjects(layer, posX + layer.x, posY + layer.y)
      case 'imagelayer':
        return this.drawImage(layer, posX + layer.x, posY + layer.y)
      case 'tilelayer':
        return this.drawTiles(layer, posX + layer.x, posY + layer.y)
    }
  }

  drawLayers (layers, x, y) {
    for (const layer of layers) {
      if (layer.visible) {
        this.drawLayer(layer, x, y)
      }
    }
  }

  draw () {
    if (!this.map) {
      return
    }
    // TODO: Apply the tint to the background color.
    r.DrawRectangle(this.x, this.y, this.map.width * this.map.tilewidth, this.map.height * this.map.tileheight, this.bgcolor)
    this.drawLayers(this.map.layers, this.x, this.y)
  }

  unload () {}
}
