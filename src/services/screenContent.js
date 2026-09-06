export function stripGuidanceCards(html) {
  return String(html ?? '').replace(/<div\s+class=["']note["'][^>]*>[\s\S]*?<\/div>/gi, '')
}

export function stripProductionSelectionIndicators(html) {
  return stripGuidanceCards(html)
    .replace(/class=(["'])choice\s+active\1/gi, 'class=$1choice$1')
    .replace(/<i>\s*✓\s*<\/i>/gi, '<i></i>')
}
