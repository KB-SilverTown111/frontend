function scheduleData(branch) {
  if (Array.isArray(branch?.schedule)) return branch.schedule[0] || branch
  return branch?.schedule || branch?.schedules?.[0] || branch || {}
}

function mobileListLabel(value) {
  if (!value || typeof value !== 'object') return String(value ?? '').trim()

  const displayValue =
    value.serviceName ??
    value.documentName ??
    value.itemName ??
    value.name ??
    value.label ??
    value.title ??
    value.preparationNote
  return String(displayValue ?? '').trim()
}

function normalizeMobileList(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(mobileListLabel).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function firstMobileList(...values) {
  for (const value of values) {
    const list = normalizeMobileList(value)
    if (list.length) return list
  }
  return []
}

export function mobileBranchId(branch) {
  return branch?.branchId ?? branch?.id
}

export function mobileBranchName(branch) {
  return branch?.name || branch?.branchName || 'KB 이동점포'
}

export function mobileBranchAddress(branch) {
  return branch?.address || branch?.location || branch?.locationName || '방문 장소 확인 중'
}

export function mobileBranchDistance(branch) {
  const rawDistance = branch?.distanceMeters
  if (rawDistance == null || (typeof rawDistance === 'string' && !rawDistance.trim())) {
    return '거리 확인 중'
  }

  const distance = Number(rawDistance)
  if (!Number.isFinite(distance) || distance < 0) return '거리 확인 중'
  if (distance < 1000) return `${Math.round(distance)}m`
  return `${(distance / 1000).toFixed(1)}km`
}

export function mobileBranchSchedule(branch) {
  const schedule = scheduleData(branch)
  const date = schedule.scheduleDate || schedule.visitDate || schedule.date
  const visitTime = formatVisitTime(
    schedule.visitTime ?? schedule.time ?? branch?.visitTime ?? branch?.time,
  )
  const startTime = schedule.startTime || schedule.openTime
  const endTime = schedule.endTime || schedule.closeTime
  const dateText = formatMobileDate(date)
  const timeText =
    visitTime || (startTime && endTime ? `${startTime}~${endTime}` : startTime || endTime)

  return (
    [dateText === '일정 확인 중' ? '' : dateText, timeText].filter(Boolean).join(' · ') ||
    '방문 일정 확인 중'
  )
}

function formatVisitTime(value) {
  if (typeof value === 'string') return value.trim()
  if (!value || typeof value !== 'object') return ''

  const startTime = value.startTime || value.start || value.openTime
  const endTime = value.endTime || value.end || value.closeTime
  return startTime && endTime ? `${startTime}~${endTime}` : startTime || endTime || ''
}

function formatMobileDate(value) {
  if (!value) return '일정 확인 중'
  const text = String(value)
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00+09:00` : text)
  if (Number.isNaN(date.getTime())) return text

  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Seoul',
  })
}

export function mobileBranchServices(branch) {
  const schedule = scheduleData(branch)
  return firstMobileList(
    schedule.availableServices,
    schedule.availableWorks,
    schedule.services,
    branch?.availableServices,
    branch?.availableWorks,
    branch?.services,
  )
}

export function mobileBranchDocuments(branch) {
  const schedule = scheduleData(branch)
  const preparationNotes = Array.isArray(schedule.services)
    ? schedule.services.map((service) => service?.preparationNote)
    : []

  return firstMobileList(
    schedule.requiredDocuments,
    schedule.requiredItems,
    schedule.preparationItems,
    branch?.requiredDocuments,
    branch?.requiredItems,
    branch?.preparationItems,
    preparationNotes,
  )
}
