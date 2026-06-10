
const MAX_UPLOAD_BYTES = 9 * 1024 * 1024
const INITIAL_LONG_EDGE = 1920
const JPEG_QUALITY = 0.85

function isHeicLikeFile(file) {
  if (!file) return false
  const t = (file.type || '').toLowerCase()
  if (t === 'image/heic' || t === 'image/heif') return true
  return /\.(heic|heif)$/i.test(file.name || '')
}

const HEIC2ANY_ESM = 'https://esm.sh/heic2any@0.0.4'

async function loadHeic2any() {
  const mod = await import( HEIC2ANY_ESM)
  return mod.default ?? mod
}

async function heicToJpegFile(file) {
  const heic2any = await loadHeic2any()
  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.92,
  })
  const blob = Array.isArray(result) ? result[0] : result
  const base = (file.name || 'photo').replace(/\.[^.]+$/i, '') || 'photo'
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
}

export async function prepareImageFileForUpload(file) {
  if (!file) return file

  let working = file
  if (isHeicLikeFile(file)) {
    try {
      working = await heicToJpegFile(file)
    } catch {
      working = file
    }
  }

  if (!working.type.startsWith('image/')) {
    return working
  }
  if (working.type === 'image/heic' || working.type === 'image/heif') {
    return working
  }
  if (working.size <= MAX_UPLOAD_BYTES && working.size <= 1.5 * 1024 * 1024) {
    return working
  }

  try {
    const bitmap = await createImageBitmap(working)
    try {
      let longEdgeLimit = INITIAL_LONG_EDGE
      let blob = null

      for (let attempt = 0; attempt < 4; attempt += 1) {
        let { width, height } = bitmap
        const longEdge = Math.max(width, height)
        if (longEdge > longEdgeLimit) {
          const scale = longEdgeLimit / longEdge
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return working
        }
        ctx.drawImage(bitmap, 0, 0, width, height)

        blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('toBlob'))),
            'image/jpeg',
            JPEG_QUALITY,
          )
        })

        if (blob.size <= MAX_UPLOAD_BYTES) {
          break
        }
        longEdgeLimit = Math.round(longEdgeLimit * 0.72)
      }

      if (!blob || blob.size > MAX_UPLOAD_BYTES) {
        return working
      }

      const name = working.name.replace(/\.[^.]+$/, '') || 'photo'
      return new File([blob], `${name}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
    } finally {
      bitmap.close()
    }
  } catch {
    return working
  }
}

export function isFileProbablyTooLarge(file, maxBytes = MAX_UPLOAD_BYTES) {
  return file.size > maxBytes
}

export { MAX_UPLOAD_BYTES }
