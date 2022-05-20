// this manages a dialog attached to a markdown file

import r from 'raylib'

import { runDialog } from 'mdif'

const patch = { source: { x: 0, y: 0, height: 64, width: 64 }, left: 6, top: 6, right: 6, bottom: 6, layout: r.NPATCH_NINE_PATCH }

// crappy wordwrap. eventually do this properly
const wrap = (s, w) => s.replace(
  new RegExp(`(?![^\\n]{1,${w}}$)([^\\n]{1,${w}})\\s`, 'g'), '$1\n'
)

export default class Dialog {
  constructor (md, options = {}) {
    this.md = md
    this.open = !!options.open
    this.color = options.color || r.WHITE
    this.fontSize = options.fontSize || 12
    this.texture = options.texture || r.LoadTexture('assets/ninepatch.png')
    this.position = options.position || { x: 5, y: 135, width: 312, height: 100 }
    this.speed = options.speed || 2
  }

  set (dialog, position = 0, variables = {}) {
    this.state = runDialog(this.md, dialog, variables, position)
    if (this.state.ending === 'prompt') {
      this.state.menu = runDialog(this.md, dialog, variables, position + 1)
      this.currentOption = 0
    } else {
      this.state.menu = false
    }
  }

  draw () {
    if (this.open) {
      if (this.state.ending === 'more' || this.state.ending === 'prompt') {
        r.DrawTextureNPatch(
          this.texture,
          patch,
          this.position,
          { x: 0, y: 0 },
          0,
          this.color
        )

        if (this.state.who) {
          r.DrawText(this.state.who, this.position.x + 10 - 2, this.position.y - 10 - 2, this.fontSize, r.BLACK)
          r.DrawText(this.state.who, this.position.x + 10, this.position.y - 10, this.fontSize, this.color)
        }

        r.DrawText(wrap(this.state.text, 30), this.position.x + 10, this.position.y + 15, this.fontSize, this.color)

        if (this.state.menu) {
          for (const o in this.state.menu) {
            const { text } = this.state.menu[o]
            r.DrawText(wrap(text, 30), this.position.x + 30, this.position.y + 34 + (o * (this.fontSize + 4)), this.fontSize, this.color)
          }

          r.DrawRectangle(this.position.x + 18, this.position.y + 38 + (this.currentOption * 16), 5, 5, this.color)
        }

        if (this.state.ending === 'more' && Math.floor(r.GetTime() * this.speed) % 2 === 0) {
          r.DrawRectangle(this.position.x + this.position.width - 15, this.position.y + this.position.height - 15, 5, 5, this.color)
        }
      }
    }
  }
}
