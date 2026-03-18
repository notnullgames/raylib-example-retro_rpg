// Raylib dialog box renderer
// Draws the current state of a DialogSystem at the bottom of the screen.

import r from 'raylib'

const DIALOG_PAD = 8
const FONT_SIZE = 10
const LINE_H = 12

// Nine-patch descriptor for the 64x64 panel image
const NPATCH = { source: { x: 0, y: 0, width: 64, height: 64 }, left: 6, top: 6, right: 6, bottom: 6, layout: r.NPATCH_NINE_PATCH }

let _texture = null

/**
 * Load the dialog panel texture. Must be called after r.InitWindow().
 * @param {string} imagePath  path to the ninepatch PNG (e.g. 'assets/ninepatch.png')
 */
export function initDialog(imagePath) {
  _texture = r.LoadTexture(imagePath)
}

/**
 * Word-wrap `text` so each line fits within `maxWidth` pixels.
 * Returns an array of strings.
 */
function wrapText(text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let current = ''

  for (const word of words) {
    const candidate = current ? current + ' ' + word : word
    if (r.MeasureText(candidate, FONT_SIZE) <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

/**
 * Draw the dialog box for a DialogSystem instance.
 *
 * @param {import('./mdif.js').DialogSystem} dialog
 * @param {number} screenW
 * @param {number} screenH
 * @param {number} menuIndex  currently highlighted menu item index
 */
export function drawDialog(dialog, screenW, screenH, menuIndex = 0) {
  if (!dialog.isOpen) return

  const innerW = screenW - DIALOG_PAD * 4  // usable text width inside the box

  // --- measure required height --------------------------------------------

  const contentLines = []  // array of { text, color }

  // Speaker name shown above the box (line mode only)
  const speaker = dialog.choices.length === 0 && dialog.current?.speaker ? dialog.current.speaker : null
  const speakerH = speaker ? LINE_H : 0

  if (dialog.choices.length > 0) {
    // Menu mode: word-wrap each choice, indent continuation lines
    const prefix = '> '
    const indent = '  '
    const prefixW = r.MeasureText(prefix, FONT_SIZE)
    for (let i = 0; i < dialog.choices.length; i++) {
      const selected = i === menuIndex
      const color = selected ? r.YELLOW : r.WHITE
      const wrapped = wrapText(dialog.choices[i].label, innerW - prefixW)
      for (let j = 0; j < wrapped.length; j++) {
        const leader = j === 0 ? (selected ? prefix : indent) : indent
        contentLines.push({ text: leader + wrapped[j], color })
      }
    }
  } else if (dialog.current) {
    const wrapped = wrapText(dialog.current.text, innerW)
    for (const line of wrapped) {
      contentLines.push({ text: line, color: r.WHITE })
    }
  }

  const hasHint = dialog.choices.length === 0 && dialog.current
  const contentH = contentLines.length * LINE_H
  const boxH = contentH + DIALOG_PAD * 2 + (hasHint ? LINE_H : 0)

  // --- layout -------------------------------------------------------------

  const boxX = DIALOG_PAD
  const boxY = screenH - boxH - DIALOG_PAD - speakerH
  const boxW = screenW - DIALOG_PAD * 2

  // --- draw speaker name above box ----------------------------------------

  if (speaker) {
    r.DrawText(speaker, boxX + DIALOG_PAD, boxY, FONT_SIZE, r.YELLOW)
  }

  // --- draw nine-patch background -----------------------------------------

  const position = { x: boxX, y: boxY + speakerH, width: boxW, height: boxH }
  if (_texture) {
    r.DrawTextureNPatch(_texture, NPATCH, position, { x: 0, y: 0 }, 0, r.WHITE)
  } else {
    // Fallback if initDialog() was not called
    r.DrawRectangle(boxX, boxY + speakerH, boxW, boxH, r.Fade(r.BLACK, 0.75))
    r.DrawRectangleLines(boxX, boxY + speakerH, boxW, boxH, r.WHITE)
  }

  // --- draw content -------------------------------------------------------

  for (let i = 0; i < contentLines.length; i++) {
    const { text, color } = contentLines[i]
    r.DrawText(text, boxX + DIALOG_PAD, boxY + speakerH + DIALOG_PAD + i * LINE_H, FONT_SIZE, color)
  }

  // "press Z" hint in line mode
  if (hasHint) {
    const hint = '[Z] next'
    const hintW = r.MeasureText(hint, FONT_SIZE)
    r.DrawText(hint, boxX + boxW - DIALOG_PAD - hintW, boxY + speakerH + boxH - DIALOG_PAD - FONT_SIZE, FONT_SIZE, r.GRAY)
  }
}
