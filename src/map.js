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
    this.bgcolor = colorFromTiled(this.map.backgroundcolor || '#000000')
  }

  drawObjects (layer, posX, posY) {}

  drawImage (layer, posX, posY) {}

  drawTiles (layer, posX, posY) {
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        for (const layer of this.map.layers) {
          if (layer.type === 'tilelayer' && layer.visible) {
            const gid = layer.data[x + (y * this.map.width)]
            if (gid && this.map.tiles[gid]) {
              const { ts, sx, sy } = this.map.tiles[gid]
              const tileset = this.map.tilesets[ts]
              tileset.resource_image = tileset.resource_image || r.LoadTexture(tileset.image)
              r.DrawTextureRec(
                tileset.resource_image,
                { x: sx, y: sy, width: tileset.tilewidth, height: tileset.tileheight },
                { x: x * tileset.tilewidth + posX, y: y * tileset.tileheight + posY },
                r.ColorAlpha(this.tint, layer.opacity * 255)
              )
            }
          }
        }
      }
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
