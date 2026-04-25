import { getEmojiUrl } from '@/utils/emoji'

export default function Emoji({ emoji, size = 20, className = '' }) {
  return (
    <img
      src={getEmojiUrl(emoji)}
      alt={emoji}
      width={size}
      height={size}
      className={className}
      draggable={false}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    />
  )
}
