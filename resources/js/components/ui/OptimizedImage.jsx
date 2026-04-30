import { forwardRef } from 'react'

/**
 * Drop-in <img> replacement with WebP + PNG fallback via <picture>.
 * All props (className, style, draggable, ref, etc.) are forwarded to the <img>.
 * The <picture> wrapper uses display:contents so it is invisible to layout.
 */
const OptimizedImage = forwardRef(function OptimizedImage({ src, alt = '', ...props }, ref) {
  const normalizedSrc = typeof src === 'string' ? src : ''
  const hasSource = normalizedSrc.length > 0
  const webpSrc = hasSource && /\.png$/i.test(normalizedSrc)
    ? normalizedSrc.replace(/\.png$/i, '.webp')
    : ''

  if (!hasSource) {
    return <img ref={ref} src="" alt={alt} {...props} />
  }

  return (
    <picture style={{ display: 'contents' }}>
      {webpSrc ? <source srcSet={webpSrc} type="image/webp" /> : null}
      <img ref={ref} src={normalizedSrc} alt={alt} {...props} />
    </picture>
  )
})

export default OptimizedImage
