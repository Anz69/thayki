export function getEmojiUrl(emoji) {
  const codepoint = [...emoji]
    .map((char) => char.codePointAt(0).toString(16))
    .filter((cp) => cp !== 'fe0f')
    .join('-')
  return `/emoji/${codepoint}.png`
}
