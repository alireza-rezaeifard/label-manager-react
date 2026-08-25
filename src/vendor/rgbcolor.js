/**
 * Minimal dependency-free `rgbcolor` module.
 * canvg (bundled via jspdf → SVG parsing) imports `RGBColor` from `rgbcolor`.
 * The npm package's `index.js` is missing in this repo's node_modules, which
 * breaks the production build. This repo-scoped ESM module provides a
 * compatible implementation (mapped via the `rgbcolor` alias in vite.config).
 */

export default class RGBColor {
  constructor(colorString) {
    this.ok = false
    this.r = 0
    this.g = 0
    this.b = 0
    this.a = 1
    this.setColor(colorString)
  }

  setColor(colorString) {
    if (colorString == null) return
    const s = String(colorString).trim()
    let m

    if ((m = /^#([0-9a-f]{3})$/i.exec(s))) {
      this.r = parseInt(m[1][0] + m[1][0], 16)
      this.g = parseInt(m[1][1] + m[1][1], 16)
      this.b = parseInt(m[1][2] + m[1][2], 16)
      this.ok = true
    } else if ((m = /^#([0-9a-f]{6})$/i.exec(s))) {
      this.r = parseInt(m[1].slice(0, 2), 16)
      this.g = parseInt(m[1].slice(2, 4), 16)
      this.b = parseInt(m[1].slice(4, 6), 16)
      this.ok = true
    } else if ((m = /^rgba?\(\s*([\d.%]+)\s*,\s*([\d.%]+)\s*,\s*([\d.%]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(s))) {
      this.r = parseComponent(m[1])
      this.g = parseComponent(m[2])
      this.b = parseComponent(m[3])
      this.a = m[4] !== undefined ? Math.max(0, Math.min(1, Number(m[4]))) : 1
      this.ok = true
    } else if ((m = /^([a-z]+)$/i.exec(s))) {
      const hex = NAMED[m[1].toLowerCase()]
      if (hex) { this.r = parseInt(hex.slice(0, 2), 16); this.g = parseInt(hex.slice(2, 4), 16); this.b = parseInt(hex.slice(4, 6), 16); this.ok = true }
    }
    return this
  }

  toRGB() {
    return 'rgb(' + Math.round(this.r) + ', ' + Math.round(this.g) + ', ' + Math.round(this.b) + ')'
  }

  toHex() {
    return '#' + toHex(this.r) + toHex(this.g) + toHex(this.b)
  }

  get valid() {
    return !!this.ok
  }
}

function parseComponent(v) {
  if (typeof v === 'string' && v.endsWith('%')) {
    return (Number(v.slice(0, -1)) / 100) * 255
  }
  return Math.max(0, Math.min(255, Number(v)))
}
function toHex(n) {
  return ('0' + Math.round(n).toString(16)).slice(-2)
}

const NAMED = {
  black: '000000', white: 'ffffff', red: 'ff0000', green: '008000', blue: '0000ff',
  yellow: 'ffff00', orange: 'ffa500', purple: '800080', gray: '808080', grey: '808080',
  transparent: '000000', silver: 'c0c0c0', maroon: '800000', olive: '808000', lime: '00ff00',
  aqua: '00ffff', teal: '008080', navy: '000080', fuchsia: 'ff00ff',
}
