// Markdown-driven dialog system (mdif)
//
// Format (game.md):
//   ## SectionName        <- dialog id (lowercased, spaces→-)
//   > _Speaker_ Text      <- a line of dialog (speaker underlined in the quote)
//   - [Label](#id)        <- menu choice that jumps to another dialog
//   - [Label](END)        <- menu choice that closes the dialog
//
// Usage:
//   import { parseDialog, DialogSystem } from './mdif.js'
//   const dialog = new DialogSystem(await fs.readFile('game.md', 'utf8'))
//   dialog.onChoice = (choice) => {
//     if (choice.url === 'END') { /* close dialog */ }
//     else dialog.open(choice.url.replace('#', ''))
//   }
//   dialog.open('test')
//   // each frame, call dialog.current to get current line, dialog.advance() on confirm

import md from 'markdown-ast'
import fm from 'front-matter'

// --- helpers ----------------------------------------------------------------

/** Extract plain text from an AST node array */
function blockText(block = []) {
  return block
    .map((n) => {
      if (n.type === 'text') return n.text
      if (n.block) return blockText(n.block)
      return ''
    })
    .join('')
}

/** Derive a dialog id from a heading string (lowercase, spaces→hyphens) */
function headingId(text) {
  return text.trim().toLowerCase().replace(/\s+/g, '-')
}

// --- parser -----------------------------------------------------------------

/**
 * Parse a markdown string into:
 *   info       – frontmatter attributes
 *   dialogs    – Map<id, { lines: [{speaker, text}], choices: [{label, url}] }>
 */
export function parseDialog(markdown) {
  const { attributes, body } = fm(markdown)
  const ast = md(body)

  /** @type {Map<string, {lines: Array<{speaker:string,text:string}>, choices: Array<{label:string,url:string}>}>} */
  const dialogs = new Map()

  let currentId = null

  for (const node of ast) {
    // A h2 title starts a new dialog section
    if (node.type === 'title' && node.rank === 2) {
      currentId = headingId(blockText(node.block))
      dialogs.set(currentId, { lines: [], choices: [] })
      continue
    }

    if (currentId === null) continue
    const section = dialogs.get(currentId)

    // Blockquote → a line of dialog
    // Expected structure: > _Speaker_ Rest of text
    if (node.type === 'quote') {
      const block = node.block ?? []
      let speaker = ''
      let text = ''

      if (block[0]?.type === 'italic') {
        speaker = blockText(block[0].block)
        // Everything after the italic node
        text = block
          .slice(1)
          .map((n) => (n.type === 'text' ? n.text : blockText(n.block ?? [])))
          .join('')
          .trimStart()
      } else {
        text = blockText(block)
      }

      section.lines.push({ speaker, text })
      continue
    }

    // List item → a menu choice
    if (node.type === 'list') {
      const block = node.block ?? []
      // Each list item's block should be a single link node
      const link = block.find((n) => n.type === 'link')
      if (link) {
        section.choices.push({
          label: blockText(link.block),
          url: link.url
        })
      }
      continue
    }
  }

  return { info: attributes, dialogs }
}

// --- DialogSystem -----------------------------------------------------------

/**
 * Engine-agnostic dialog state machine.
 *
 * Events / callbacks:
 *   onLine(line)       – called whenever the current line changes
 *                        line = { speaker, text } | null
 *   onChoices(choices) – called when the last line has been shown and choices
 *                        are available. choices = [{label, url}]
 *                        If no choices exist the dialog auto-closes (onClose).
 *   onChoice(choice)   – called when the user picks a menu item.
 *                        choice = { label, url }
 *                        url === 'END' means close; '#id' means jump to id.
 *                        You are expected to call dialog.open(id) or leave it.
 *   onClose()          – called when the dialog ends (no more lines/choices).
 *
 * API:
 *   dialog.open(id)    – start/restart a named dialog section
 *   dialog.advance()   – move to next line (call on confirm key-press)
 *   dialog.choose(i)   – pick menu option by index
 *   dialog.current     – { speaker, text } of the current line, or null
 *   dialog.choices     – current choices array (populated after last line)
 *   dialog.isOpen      – true while a dialog is active
 */
export class DialogSystem {
  constructor(markdown) {
    const { info, dialogs } = parseDialog(markdown)
    this.info = info
    this.dialogs = dialogs

    this._section = null
    this._lineIndex = -1
    this.current = null
    this.choices = []
    this.isOpen = false

    // Callbacks – override these
    this.onLine = null
    this.onChoices = null
    this.onChoice = null
    this.onClose = null
  }

  /** Start a dialog section by id */
  open(id) {
    const section = this.dialogs.get(id.toLowerCase())
    if (!section) {
      console.warn(`[mdif] Unknown dialog id: "${id}"`)
      return
    }
    this._section = section
    this._lineIndex = -1
    this.choices = []
    this.isOpen = true
    this.advance()
  }

  /** Advance to the next line. Call this on each user confirmation. */
  advance() {
    if (!this._section) return

    const { lines, choices } = this._section
    this._lineIndex++

    if (this._lineIndex < lines.length) {
      this.current = lines[this._lineIndex]
      this.choices = []
      if (this.onLine) this.onLine(this.current)
    } else {
      // Past the last line
      this.current = null
      if (choices.length > 0) {
        this.choices = choices
        if (this.onChoices) this.onChoices(this.choices)
      } else {
        this._close()
      }
    }
  }

  /** Pick a menu choice by index */
  choose(index) {
    const choice = this.choices[index]
    if (!choice) return

    this.choices = []
    if (this.onChoice) {
      this.onChoice(choice)
    } else {
      // Default handling when no callback is provided
      if (choice.url === 'END') {
        this._close()
      } else {
        const id = choice.url.replace(/^#/, '')
        this.open(id)
      }
    }
  }

  close() {
    this.isOpen = false
    this._section = null
    this.current = null
    this.choices = []
    if (this.onClose) this.onClose()
  }
}

/** Convenience: parse + return a ready-to-use DialogSystem */
export default function createDialog(markdown) {
  return new DialogSystem(markdown)
}
