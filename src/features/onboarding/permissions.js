export const NATIVE_PERMISSION_ORDER = Object.freeze([
  'contacts',
  'camera',
  'location',
  'microphone',
])

export function arePermissionsGranted(permissions = {}) {
  return NATIVE_PERMISSION_ORDER.every((permission) =>
    ['granted', 'limited'].includes(permissions[permission]),
  )
}

export async function requestPermissionsInOrder(requesters = {}) {
  const failures = []

  for (const permission of NATIVE_PERMISSION_ORDER) {
    const request = requesters[permission]
    if (typeof request !== 'function') continue

    try {
      await request()
    } catch (error) {
      failures.push({ permission, error })
    }
  }

  return failures
}
