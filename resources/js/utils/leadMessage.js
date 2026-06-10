export function buildLeadMessage({ t, modelName, city, wishes, options = {} }) {
  const lines = [t('leadMsg.title'), '']

  if (modelName) {
    lines.push(`${t('leadMsg.interested')}: ${modelName}`)
  } else if (options.hair) {
    lines.push(`${t('leadMsg.hair')}: ${t(`request.hair.${options.hair}`)}`)
  }

  lines.push(`${t('leadMsg.city')}: ${city}`)

  if (options.ages)    lines.push(`${t('leadMsg.age')}: ${t(`request.ages.${options.ages}`)}`)
  if (options.heights) lines.push(`${t('leadMsg.height')}: ${t(`request.heights.${options.heights}`)}`)
  if (options.goals)   lines.push(`${t('leadMsg.goal')}: ${t(`request.goals.${options.goals}`)}`)

  if (wishes && wishes.trim()) {
    lines.push(`${modelName ? t('leadMsg.wishesExtra') : t('leadMsg.wishes')}: ${wishes.trim()}`)
  }

  return lines.join('\n')
}
