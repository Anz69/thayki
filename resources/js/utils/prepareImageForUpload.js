/** Max upload size server accepts — margin under Laravel/nginx 10MB */
const MAX_UPLOAD_BYTES = 9 * 1024 * 1024
const INITIAL_LONG_EDGE = 1920
const JPEG_QUALITY = 0.85

/**
 * Downscale / recompress raster images so uploads stay under limits and load faster.
 * HEIC/HEIF is returned unchanged (browser often cannot decode; server handles if Imagick exists).
 *
 * @param {File} file
 * @returns {Promise<File>}
 */
export async function prepareImageFileForUpload(file) {
  if (!file || !file.type.startsWith('image/')) {
    return file
  }
  if (file.type === 'image/heic' || file.type === 'image/heif') {
    return file
  }
  if (file.size <= MAX_UPLOAD_BYTES && file.size <= 1.5 * 1024 * 1024) {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
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
          return file
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
        return file
      }

      const name = file.name.replace(/\.[^.]+$/, '') || 'photo'
      return new File([blob], `${name}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
    } finally {
      bitmap.close()
    }
  } catch {
    return file
  }
}

export function isFileProbablyTooLarge(file, maxBytes = MAX_UPLOAD_BYTES) {
  return file.size > maxBytes
}

export { MAX_UPLOAD_BYTES }
