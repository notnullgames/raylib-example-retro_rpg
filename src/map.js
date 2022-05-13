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
  }

  drawObjects (layer, posX, posY) {}

  drawImage (layer, posX, posY) {}

  drawTiles (layer, posX, posY) {}

  drawLayer (layer, posX, posY) {
    switch (layer.type) {
      case 'group':
        return this.drawLayers(layer.layers, posX + layer.offsetx, posY + layer.offsety)
      case 'objectgroup':
        return this.drawObjects(layer, posX + layer.offsetx, posY + layer.offsety)
      case 'imagelayer':
        return this.drawImage(layer, posX + layer.offsetx, posY + layer.offsety)
      case 'tilelayer':
        return this.drawTiles(layer, posX + layer.offsetx, posY + layer.offsety)
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
