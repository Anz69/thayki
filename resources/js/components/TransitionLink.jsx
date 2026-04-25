import { forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { transitionIn, setPageReady } from '@/utils/pageTransition'

const TransitionLink = forwardRef(function TransitionLink(
  { to, children, className, onClick, ...rest },
  ref,
) {
  const navigate = useNavigate()

  const handleClick = async (e) => {
    e.preventDefault()
    onClick?.(e)
    setPageReady(false)
    await transitionIn()
    navigate(to)
  }

  return (
    <a ref={ref} href={to} onClick={handleClick} className={className} {...rest}>
      {children}
    </a>
  )
})

export default TransitionLink
