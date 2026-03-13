#!/usr/bin/env node
// Generates icon-192.png and icon-512.png with glucometer + insulin pen + "GL"
const zlib = require('zlib')
const fs = require('fs')

function generateIcon(SIZE) {
  const buf = new Uint8Array(SIZE * SIZE * 4)

  // --- colors ---
  const BG     = [15, 23, 42]
  const BG2    = [22, 33, 62]
  const SLATE  = [51, 65, 85]
  const SLATE2 = [68, 85, 107]
  const SLATE3 = [38, 50, 68]
  const SCREEN = [8, 25, 50]
  const CYAN   = [34, 211, 238]
  const GOLD   = [251, 191, 36]
  const GOLD2  = [217, 155, 10]
  const WHITE  = [240, 244, 248]
  const LGRAY  = [180, 200, 220]
  const GRAY   = [110, 130, 150]
  const BLUE   = [59, 130, 246]
  const DBLUE  = [28, 52, 120]
  const DBLUE2 = [38, 70, 160]
  const GREEN  = [34, 197, 94]
  const GREEN2 = [160, 255, 190]
  const RED    = [239, 68, 68]
  const RED2   = [255, 130, 130]

  function setpx(x, y, col, a = 255) {
    x = Math.round(x); y = Math.round(y)
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return
    const i = (y * SIZE + x) * 4
    if (a >= 255) {
      buf[i] = col[0]; buf[i+1] = col[1]; buf[i+2] = col[2]; buf[i+3] = 255
    } else {
      const fa = a / 255, ia = 1 - fa
      buf[i]   = (buf[i]   * ia + col[0] * fa + 0.5) | 0
      buf[i+1] = (buf[i+1] * ia + col[1] * fa + 0.5) | 0
      buf[i+2] = (buf[i+2] * ia + col[2] * fa + 0.5) | 0
      buf[i+3] = 255
    }
  }

  function fillRect(x, y, w, h, col, a = 255) {
    for (let row = y; row < y + h; row++)
      for (let col2 = x; col2 < x + w; col2++)
        setpx(col2, row, col, a)
  }

  function rrect(x, y, w, h, r, col, a = 255) {
    const x2 = x + w, y2 = y + h
    for (let row = y; row < y2; row++) {
      for (let cx = x; cx < x2; cx++) {
        let ok = true
        if      (cx < x+r  && row < y+r)  ok = (cx-x-r)**2 + (row-y-r)**2 <= r*r
        else if (cx >= x2-r && row < y+r)  ok = (cx-x2+r)**2 + (row-y-r)**2 <= r*r
        else if (cx < x+r  && row >= y2-r) ok = (cx-x-r)**2 + (row-y2+r)**2 <= r*r
        else if (cx >= x2-r && row >= y2-r) ok = (cx-x2+r)**2 + (row-y2+r)**2 <= r*r
        if (ok) setpx(cx, row, col, a)
      }
    }
  }

  function circle(cx, cy, rad, col, a = 255) {
    const ir = Math.ceil(rad) + 1
    for (let row = cy - ir; row <= cy + ir; row++) {
      for (let col2 = cx - ir; col2 <= cx + ir; col2++) {
        const d = Math.sqrt((col2-cx)**2 + (row-cy)**2)
        if (d <= rad - 0.5) setpx(col2, row, col, a)
        else if (d < rad + 0.5) setpx(col2, row, col, Math.round(a * (rad + 0.5 - d)))
      }
    }
  }

  function lineThick(x1, y1, x2, y2, col, thick, a = 255) {
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.sqrt(dx*dx + dy*dy)
    if (!len) return
    const nx = -dy / len, ny = dx / len
    const steps = Math.ceil(len * 2)
    const h = thick / 2
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const bx = x1 + dx * t, by = y1 + dy * t
      for (let w = -Math.ceil(h + 1); w <= Math.ceil(h + 1); w++) {
        const dist = Math.abs(w)
        if (dist <= h - 0.5) setpx(bx + nx*w, by + ny*w, col, a)
        else if (dist < h + 0.5) setpx(bx + nx*w, by + ny*w, col, Math.round(a * (h + 0.5 - dist)))
      }
    }
  }

  // --- bitmap glyphs (6×7) ---
  const GLYPHS = {
    G: [[0,1,1,1,1,0],[1,0,0,0,0,0],[1,0,0,0,0,0],[1,0,1,1,1,1],[1,0,0,0,0,1],[1,0,0,0,0,1],[0,1,1,1,1,0]],
    L: [[1,0,0,0,0,0],[1,0,0,0,0,0],[1,0,0,0,0,0],[1,0,0,0,0,0],[1,0,0,0,0,0],[1,0,0,0,0,0],[1,1,1,1,1,1]],
  }
  function glyph(ch, ox, oy, sc, col) {
    const g = GLYPHS[ch]; if (!g) return
    g.forEach((row, ri) => row.forEach((bit, ci) => {
      if (bit) fillRect(ox + ci*sc, oy + ri*sc, sc, sc, col)
    }))
  }

  // small 3×5 digit bitmaps
  const DIGS = {
    '0': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
    '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
    '2': [[1,1,1],[0,0,1],[0,1,1],[1,0,0],[1,1,1]],
    '3': [[1,1,1],[0,0,1],[0,1,1],[0,0,1],[1,1,1]],
    '4': [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
    '5': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
    '6': [[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],
    '7': [[1,1,1],[0,0,1],[0,1,0],[0,1,0],[0,1,0]],
    '8': [[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
    '9': [[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]],
  }
  function drawDigit(ch, ox, oy, sc, col) {
    const g = DIGS[ch]; if (!g) return
    g.forEach((row, ri) => row.forEach((bit, ci) => {
      if (bit) fillRect(ox + ci*sc, oy + ri*sc, sc, sc, col)
    }))
  }

  // scale factor (everything relative to 192)
  const K = SIZE / 192

  function s(v) { return Math.round(v * K) }

  // ── BACKGROUND ─────────────────────────────────────────
  fillRect(0, 0, SIZE, SIZE, BG)
  rrect(s(4), s(4), s(184), s(184), s(28), BG2)

  // Subtle inner border glow (top edge)
  for (let i = 0; i < s(3); i++) {
    const alpha = 60 - i * 18
    fillRect(s(4)+i, s(4)+i, s(184)-i*2, 1, [60, 100, 180], alpha)
  }

  // ── "GL" TEXT (top center, gold) ────────────────────────
  const glSc = Math.max(1, Math.round(5 * K))
  const glyphW = 6 * glSc
  const glyphH = 7 * glSc
  const glGap = s(7)
  const totalGW = glyphW * 2 + glGap
  const glX = Math.floor((SIZE - totalGW) / 2)
  const glY = s(10)

  // Gold shadow/outline
  glyph('G', glX+1, glY+1, glSc, GOLD2)
  glyph('L', glX + glyphW + glGap + 1, glY + 1, glSc, GOLD2)
  // Main gold text
  glyph('G', glX, glY, glSc, GOLD)
  glyph('L', glX + glyphW + glGap, glY, glSc, GOLD)

  // Separator line below GL
  const sepY = glY + glyphH + s(5)
  lineThick(glX, sepY, glX + totalGW, sepY, GOLD, s(1.5), 140)

  // ── GLUCOMETER (left-center area) ──────────────────────
  const gmX = s(8), gmY = s(60)
  const gmW = s(90), gmH = s(62)
  const gmR = s(10)

  // Drop shadow
  rrect(gmX+s(3), gmY+s(3), gmW, gmH, gmR, [5, 10, 20], 100)
  // Body outer
  rrect(gmX, gmY, gmW, gmH, gmR, SLATE)
  // Body highlight (lighter top strip)
  rrect(gmX+s(2), gmY+s(2), gmW-s(4), s(10), s(5), SLATE2, 180)
  // Body inner shadow
  rrect(gmX+s(2), gmY+s(2), gmW-s(4), gmH-s(4), s(8), SLATE3, 80)

  // Screen recess shadow
  const scrX = gmX + s(12), scrY = gmY + s(9)
  const scrW = s(56), scrH = s(32)
  rrect(scrX-s(1), scrY-s(1), scrW+s(2), scrH+s(2), s(5)+1, [5, 10, 25])
  // Screen bg
  rrect(scrX, scrY, scrW, scrH, s(5), SCREEN)
  // Screen glow (horizontal scanlines effect)
  for (let row = 0; row < scrH; row += s(4)) {
    fillRect(scrX+s(2), scrY+row, scrW-s(4), Math.max(1, s(1)), [30, 80, 160], 40)
  }
  // Screen top highlight
  rrect(scrX+s(2), scrY+s(2), scrW-s(4), s(4), s(2), [60, 140, 255], 80)

  // Display "108" on screen (3×5 digits, scale 2–3)
  const digSc = Math.max(1, s(2))
  const digW = 3 * digSc + digSc  // digit width + gap
  const digTotalW = digW * 3 - digSc
  const digX = scrX + Math.floor((scrW - digTotalW) / 2)
  const digY = scrY + s(6)
  drawDigit('1', digX, digY, digSc, CYAN)
  drawDigit('0', digX + digW, digY, digSc, CYAN)
  drawDigit('8', digX + digW*2, digY, digSc, CYAN)

  // "mg/dL" label (simplified as small dots/line)
  const unitY = scrY + s(6) + 5 * digSc + s(3)
  fillRect(scrX + s(7), unitY, s(24), Math.max(1, s(1.5)), GRAY, 130)

  // Blood drop on screen (top-right corner)
  const dropCX = scrX + scrW - s(12)
  const dropCY = scrY + s(5)
  const dropR = s(5)
  circle(dropCX, dropCY + dropR, dropR, RED)
  // drop tip (triangle up)
  for (let i = 0; i <= dropR * 2; i++) {
    const t = i / (dropR * 2)
    const w = Math.round(dropR * (1 - t))
    fillRect(dropCX - w, dropCY + i - dropR*2 + 1, w * 2 + 1, 1, RED)
  }
  // drop highlight
  circle(dropCX - dropR*0.3, dropCY + dropR*0.4, dropR * 0.3, RED2, 200)

  // Test strip slot (right side of glucometer body)
  const stripSlotX = gmX + gmW - s(6)
  const stripSlotY = gmY + s(14)
  const stripSlotH = s(14)
  rrect(stripSlotX, stripSlotY, s(5), stripSlotH, s(2), [20, 30, 45])
  // strip inserted
  fillRect(stripSlotX + s(1), stripSlotY + s(2), s(3), stripSlotH - s(4), [80, 110, 140], 180)

  // LED indicator (green, in-range)
  const ledX = gmX + gmW - s(18), ledY = gmY + gmH - s(12)
  circle(ledX, ledY, s(5), [10, 80, 30])
  circle(ledX, ledY, s(4), GREEN)
  circle(ledX - s(1), ledY - s(1), s(1.5), GREEN2)  // highlight

  // Buttons at bottom
  for (let i = 0; i < 3; i++) {
    const bx = gmX + s(18) + i * s(18), by = gmY + gmH - s(11)
    circle(bx, by, s(6), [40, 53, 72])
    circle(bx, by, s(4), [60, 75, 95])
    circle(bx - s(1), by - s(1), s(1.5), [100, 120, 145], 180)
  }

  // ── INSULIN PEN (bottom, full width) ───────────────────
  const penY = s(136)
  const penH = s(22)
  const penX = s(8)
  const penTotal = s(174)

  // shadow
  rrect(penX + s(2), penY + s(3), penTotal, penH, s(10), [5, 10, 20], 100)

  // Cap (left, bright blue, rounded)
  const capW = s(32)
  rrect(penX, penY, capW, penH, s(11), BLUE)
  // cap highlight
  fillRect(penX + s(3), penY + s(2), capW - s(6), Math.max(1, s(3)), [120, 180, 255], 120)
  // cap ribbing
  for (let i = 0; i < 3; i++) {
    fillRect(penX + s(8) + i * s(4), penY + s(2), s(2), penH - s(4), [40, 100, 220], 180)
  }

  // Body (dark blue)
  const bodyX = penX + capW
  const bodyW = s(88)
  rrect(bodyX, penY, bodyW, penH, s(4), DBLUE)
  // body highlight strip
  fillRect(bodyX + s(2), penY + s(2), bodyW - s(4), Math.max(1, s(3)), [80, 120, 220], 100)
  // body bottom shadow
  fillRect(bodyX + s(2), penY + penH - s(4), bodyW - s(4), Math.max(1, s(3)), [15, 30, 80], 150)

  // Dose window (translucent white inset)
  const winX = bodyX + s(18), winY = penY + s(4), winW = s(30), winH = penH - s(8)
  rrect(winX - s(1), winY - s(1), winW + s(2), winH + s(2), s(4), [10, 25, 70])  // shadow
  rrect(winX, winY, winW, winH, s(3), WHITE)
  // scale marks in window
  for (let i = 0; i < 6; i++) {
    const mx = winX + s(3) + i * Math.floor((winW - s(6)) / 5)
    const mh = (i % 2 === 0) ? winH - s(2) : Math.round((winH - s(2)) * 0.6)
    fillRect(mx, winY + s(1) + Math.round((winH - s(2) - mh)/2), Math.max(1, s(1)), mh, GRAY)
  }
  // Window number "20" shown (dose indicator)
  drawDigit('2', winX + s(5), winY + s(2), Math.max(1, s(1.5)), DBLUE2)
  drawDigit('0', winX + s(5) + s(5), winY + s(2), Math.max(1, s(1.5)), DBLUE2)

  // Grip area (ribbed texture)
  const gripX = bodyX + bodyW
  const gripW = s(36)
  rrect(gripX, penY, gripW, penH, s(3), [38, 55, 85])
  for (let i = 0; i < 9; i++) {
    const gx = gripX + i * s(4)
    if (i % 2 === 0) {
      fillRect(gx, penY, Math.max(1, s(3)), penH, [55, 75, 110], 200)
    } else {
      fillRect(gx, penY, Math.max(1, s(2)), penH, [28, 42, 68], 200)
    }
  }

  // Needle housing
  const nhX = gripX + gripW
  const nhW = s(14)
  rrect(nhX, penY + s(3), nhW, penH - s(6), s(6), LGRAY)
  fillRect(nhX + s(2), penY + s(5), nhW - s(4), Math.max(1, s(2)), WHITE, 120)

  // Needle (thin taper)
  const needleX = nhX + nhW
  const needleEndX = penX + penTotal - s(4)
  const needleMidY = penY + Math.round(penH / 2)
  lineThick(needleX, needleMidY, needleX + s(6), needleMidY, LGRAY, s(2.5))
  lineThick(needleX + s(6), needleMidY, needleEndX - s(2), needleMidY, LGRAY, s(1.5))
  lineThick(needleEndX - s(2), needleMidY, needleEndX, needleMidY, LGRAY, s(0.8))

  // ── Decorative label below glucometer ────────────────
  // Small "GLICOLOG" in tiny dots top-right of glucometer area
  // (Skip to keep clean)

  // ── Subtle vignette corners ────────────────────────────
  // Already handled by rounded background

  // ── ENCODE PNG ─────────────────────────────────────────
  function u32be(n) {
    return Buffer.from([(n>>>24)&0xff, (n>>>16)&0xff, (n>>>8)&0xff, n&0xff])
  }

  const crcTable = (() => {
    const t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[i] = c
    }
    return t
  })()
  function crc32(buf) {
    let c = 0xffffffff
    for (const b of buf) c = (c >>> 8) ^ crcTable[(c ^ b) & 0xff]
    return (c ^ 0xffffffff) >>> 0
  }
  function chunk(type, data) {
    const t = Buffer.from(type)
    const content = Buffer.concat([t, data])
    return Buffer.concat([u32be(data.length), t, data, u32be(crc32(content))])
  }

  const raw = Buffer.alloc(SIZE * (1 + SIZE * 4))
  for (let row = 0; row < SIZE; row++) {
    raw[row * (1 + SIZE * 4)] = 0
    for (let col = 0; col < SIZE; col++) {
      const src = (row * SIZE + col) * 4
      const dst = row * (1 + SIZE * 4) + 1 + col * 4
      raw[dst]   = buf[src]
      raw[dst+1] = buf[src+1]
      raw[dst+2] = buf[src+2]
      raw[dst+3] = buf[src+3]
    }
  }

  const ihdr = Buffer.concat([u32be(SIZE), u32be(SIZE), Buffer.from([8, 6, 0, 0, 0])])
  const compressed = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const png192 = generateIcon(192)
fs.writeFileSync('public/icon-192.png', png192)
console.log('icon-192.png written:', png192.length, 'bytes')

const png512 = generateIcon(512)
fs.writeFileSync('public/icon-512.png', png512)
console.log('icon-512.png written:', png512.length, 'bytes')
