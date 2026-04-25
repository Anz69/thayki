import { forwardRef } from 'react'

/**
 * Drop-in <img> replacement with WebP + PNG fallback via <picture>.
 * All props (className, style, draggable, ref, etc.) are forwarded to the <img>.
 * The <picture> wrapper uses display:contents so it is invisible to layout.
 */
const OptimizedImage = forwardRef(function OptimizedImage({ src, alt = '', ...props }, ref) {
  const webpSrc = src.replace(/\.png$/i, '.webp')

  return (
    <picture style={{ display: 'contents' }}>
      <source srcSet={webpSrc} type="image/webp" />
      <img ref={ref} src={src} alt={alt} {...props} />
    </picture>
  )
})

export default OptimizedImage
