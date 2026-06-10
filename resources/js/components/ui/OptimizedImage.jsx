import { forwardRef } from 'react'

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
