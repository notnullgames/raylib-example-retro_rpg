// Tile collision system
// Reads Tiled objectgroup polygon data from the tileset and builds a flat list
// of world-space polygons for every tile on every layer that has collision shapes.

// Standard ray-casting point-in-polygon test
function pointInPolygon(px, py, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

// Walk all tile layers in the map and collect world-space polygons for tiles
// that have Tiled collision objectgroups defined in the tileset.
// Returns an array of polygon arrays (each polygon is [{x,y}, ...] in world px).
export function buildCollisionPolygons(mapData) {
  const polygons = []

  for (const layer of mapData.layers) {
    if (layer.type !== 'tilelayer' || !layer.visible) continue

    for (let row = 0; row < mapData.height; row++) {
      for (let col = 0; col < mapData.width; col++) {
        const gid = layer.data[col + row * mapData.width]
        if (!gid) continue

        const tileInfo = mapData.tiles[gid]
        if (!tileInfo) continue

        const tileset = mapData.tilesets[tileInfo.ts]
        if (!tileset?.tiles) continue

        const localId = gid - tileset.firstgid
        const tsjTile = tileset.tiles.find(t => t.id === localId)
        if (!tsjTile?.objectgroup) continue

        // Top-left corner of this tile in world pixels
        const tileOriginX = col * tileset.tilewidth
        const tileOriginY = row * tileset.tileheight

        for (const obj of tsjTile.objectgroup.objects) {
          if (!obj.polygon) continue

          // obj.x / obj.y is the anchor of the polygon within the tile
          // each polygon point is relative to that anchor
          const worldPoly = obj.polygon.map(pt => ({
            x: tileOriginX + obj.x + pt.x,
            y: tileOriginY + obj.y + pt.y
          }))
          polygons.push(worldPoly)
        }
      }
    }
  }

  return polygons
}

// Returns true if world point (px, py) is inside any collision polygon
export function isColliding(px, py, polygons) {
  for (const poly of polygons) {
    if (pointInPolygon(px, py, poly)) return true
  }
  return false
}
