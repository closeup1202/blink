const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

// CRC32
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf, s, e) {
  let c = 0xffffffff
  for (let i = s; i < e; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function makeChunk(type, data) {
  const buf = Buffer.alloc(4 + 4 + data.length + 4)
  buf.writeUInt32BE(data.length, 0)
  buf.write(type, 4, 'ascii')
  data.copy(buf, 8)
  buf.writeUInt32BE(crc32(buf, 4, 8 + data.length), 8 + data.length)
  return buf
}

function writePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6  // 8-bit RGBA

  const scanlines = Buffer.alloc(h * (w * 4 + 1))
  for (let y = 0; y < h; y++) {
    scanlines[y * (w * 4 + 1)] = 0
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4
      const d = y * (w * 4 + 1) + 1 + x * 4
      scanlines[d] = rgba[s]; scanlines[d+1] = rgba[s+1]
      scanlines[d+2] = rgba[s+2]; scanlines[d+3] = rgba[s+3]
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })),
    makeChunk('IEND', Buffer.alloc(0)),
  ])
}

// 4x 슈퍼샘플링으로 렌더링 후 다운스케일 (계단현상 방지)
function createIcon(size) {
  const S = 4  // supersample factor
  const big = size * S
  const cx = (big - 1) / 2
  const cy = (big - 1) / 2
  const r = big / 2

  const bigData = new Float32Array(big * big * 4)

  for (let y = 0; y < big; y++) {
    for (let x = 0; x < big; x++) {
      const idx = (y * big + x) * 4
      const cornerR = r * 0.22

      // 둥근 사각형 체크
      const adx = Math.abs(x - cx) - (r - cornerR - 0.5)
      const ady = Math.abs(y - cy) - (r - cornerR - 0.5)
      const cdist = Math.sqrt(Math.max(0, adx) ** 2 + Math.max(0, ady) ** 2)
      if (cdist > cornerR) { bigData[idx+3] = 0; continue }

      // 파란 배경
      bigData[idx]   = 10
      bigData[idx+1] = 102
      bigData[idx+2] = 194
      bigData[idx+3] = 255

      // 눈 흰자: 가로로 넓은 타원
      const eyeRX = r * 0.62
      const eyeRY = r * 0.30
      const ex = (x - cx) / eyeRX
      const ey = (y - cy) / eyeRY

      if (ex * ex + ey * ey <= 1.0) {
        // 동공: 원
        const pupilR = r * 0.22
        const pd = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)

        if (pd <= pupilR) {
          bigData[idx]   = 5
          bigData[idx+1] = 35
          bigData[idx+2] = 80
        } else {
          bigData[idx]   = 255
          bigData[idx+1] = 255
          bigData[idx+2] = 255
        }
      }
    }
  }

  // 다운스케일 (box filter)
  const out = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const i = ((y * S + sy) * big + (x * S + sx)) * 4
          a += bigData[i+3]
          r += bigData[i]   * (bigData[i+3] / 255)
          g += bigData[i+1] * (bigData[i+3] / 255)
          b += bigData[i+2] * (bigData[i+3] / 255)
        }
      }
      const n = S * S
      const avgA = a / n
      const oi = (y * size + x) * 4
      out[oi]   = avgA > 0 ? Math.round(r / (avgA / 255) / n) : 0
      out[oi+1] = avgA > 0 ? Math.round(g / (avgA / 255) / n) : 0
      out[oi+2] = avgA > 0 ? Math.round(b / (avgA / 255) / n) : 0
      out[oi+3] = Math.round(avgA)
    }
  }
  return out
}

const outDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

for (const size of [16, 48, 128]) {
  const pixels = createIcon(size)
  const png = writePNG(size, size, Buffer.from(pixels))
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), png)
  console.log(`✓ icon${size}.png (${size}x${size})`)
}
