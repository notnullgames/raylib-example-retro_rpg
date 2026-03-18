// Object layer loader
//
// Reads the "objects" objectgroup layer from Tiled map data, dynamically
// imports a handler from src/objects/<class>.js for each object, and
// instantiates it.  Unknown classes are silently skipped.
//
// Each handler class must implement:
//   constructor(obj, ctx)        obj has .props as a plain {name:value} object
//                                obj.tileset is set when the object has a gid:
//                                  { texture, tileIndex, tilewidth, tileheight, columns }
//   update(time)
//   draw(mapX, mapY)
//   touching(px, py, feetW, feetY) → true if player foot-probes overlap this object's solid area
//                                    px/py is player world-center, feetW/feetY match Player
//   near(px, py)                 → true if player is close enough to activate
//   activate()                   → true if the object consumed the activation
//   unload()

import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import r from 'raylib'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Normalise Tiled's properties array to a plain object */
function normaliseProps(properties = []) {
  const out = {}
  for (const { name, value } of properties) out[name] = value
  return out
}

/** Find the tileset that owns a given gid */
function tilesetForGid(tilesets, gid) {
  // tilesets are sorted ascending by firstgid; find the last one whose firstgid <= gid
  let result = null
  for (const ts of tilesets) {
    if (ts.firstgid <= gid) result = ts
    else break
  }
  return result
}

/**
 * Load and instantiate all objects from mapData's object layer.
 *
 * @param {object} mapData   parsed Tiled JSON
 * @param {object} ctx       shared context passed to every handler (e.g. { dialog, worldX, worldY })
 * @returns {Promise<object[]>}  array of live handler instances
 */
export async function loadObjects(mapData, ctx) {
  const objectLayer = mapData.layers.find((l) => l.type === 'objectgroup' && l.name === 'objects')
  if (!objectLayer) return []

  // Cache textures by image path so we only load each once
  const textureCache = new Map()

  const instances = []

  for (const rawObj of objectLayer.objects) {
    const obj = { ...rawObj, props: normaliseProps(rawObj.properties) }
    const cls = rawObj.type // Tiled "class" field comes through as .type in JSON

    // Resolve tileset sprite info for objects that have a gid
    if (rawObj.gid != null) {
      const ts = tilesetForGid(mapData.tilesets, rawObj.gid)
      if (ts) {
        if (!textureCache.has(ts.image)) {
          textureCache.set(ts.image, r.LoadTexture(ts.image))
        }
        obj.tileset = {
          texture: textureCache.get(ts.image),
          tileIndex: rawObj.gid - ts.firstgid,
          tilewidth: ts.tilewidth,
          tileheight: ts.tileheight,
          columns: ts.columns
        }
      }
    }

    let HandlerClass
    try {
      const mod = await import(resolve(__dirname, 'objects', `${cls}.js`))
      HandlerClass = mod.default
    } catch {
      console.warn(`[objects] No handler for class "${cls}", skipping object "${rawObj.name}"`)
      continue
    }

    instances.push(new HandlerClass(obj, ctx))
  }

  return instances
}
