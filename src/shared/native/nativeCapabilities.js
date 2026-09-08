import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'
import { Contacts } from '@capacitor-community/contacts'
import { Geolocation } from '@capacitor/geolocation'

function isPermissionGranted(value) {
  return value === 'granted' || value === 'limited'
}

async function ensurePhotoPermission(source, { camera, capacitor }) {
  if (!capacitor.isNativePlatform()) return

  const permission = source === 'gallery' ? 'photos' : 'camera'
  const current = await camera.checkPermissions()
  if (isPermissionGranted(current?.[permission])) return

  const requested = await camera.requestPermissions({ permissions: [permission] })
  if (!isPermissionGranted(requested?.[permission])) {
    throw new Error(
      source === 'gallery' ? '사진 보관함 권한이 필요해요.' : '카메라 권한이 필요해요.',
    )
  }
}

export async function takeBillPhoto(source = 'camera', dependencies = {}) {
  const normalizedSource = source === 'gallery' ? 'gallery' : 'camera'
  const camera = dependencies.camera ?? Camera
  const capacitor = dependencies.capacitor ?? Capacitor
  await ensurePhotoPermission(normalizedSource, { camera, capacitor })

  if (capacitor.isNativePlatform()) {
    if (normalizedSource === 'camera' && typeof camera.takePhoto === 'function') {
      return camera.takePhoto({ quality: 90 })
    }

    if (normalizedSource === 'gallery' && typeof camera.chooseFromGallery === 'function') {
      const { results = [] } = await camera.chooseFromGallery({
        quality: 90,
        allowMultipleSelection: false,
      })
      if (results[0]) return results[0]
      throw new Error('사진을 고르지 않았어요.')
    }
  }

  return camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.Uri,
    source: normalizedSource === 'gallery' ? CameraSource.Photos : CameraSource.Camera,
    allowEditing: false,
    webUseInput: true,
  })
}

export function captureVideoFrame(video, canvas = document.createElement('canvas')) {
  const width = Number(video?.videoWidth)
  const height = Number(video?.videoHeight)

  if (!width || !height) return null

  const context = canvas.getContext('2d')
  if (!context) throw new Error('카메라 화면을 캡처할 수 없어요.')

  canvas.width = width
  canvas.height = height
  context.drawImage(video, 0, 0, width, height)

  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.9)
  })
}

export async function photoToBlob(photo) {
  const paths = [photo?.webPath, photo?.path, photo?.uri].filter(Boolean)
  for (const path of paths) {
    try {
      const fetchPath = /^file:|^content:/i.test(path) ? Capacitor.convertFileSrc(path) : path
      const response = await fetch(fetchPath)
      if (response.ok) return response.blob()
    } catch {
      // Try the next URI representation before falling back to an inline image.
    }
  }

  const base64 = photo?.base64String || photo?.thumbnail
  if (base64) {
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const format = photo?.metadata?.format || photo?.format || 'jpeg'
    return new Blob([bytes], { type: `image/${format}` })
  }

  return null
}

export async function getCurrentLocation() {
  if (Capacitor.isNativePlatform()) {
    const permissions = await Geolocation.checkPermissions()
    if (permissions.location !== 'granted') {
      const requested = await Geolocation.requestPermissions({ permissions: ['location'] })
      if (requested.location !== 'granted') throw new Error('위치 권한이 필요해요.')
    }

    return Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 })
  }

  if (!navigator.geolocation) throw new Error('이 기기에서는 위치를 확인할 수 없어요.')

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000,
    })
  })
}

/** 권한 거부와 그 밖의 실패를 화면에서 구분할 수 있게 표식을 남긴다. */
export const CONTACTS_PERMISSION_DENIED = 'CONTACTS_PERMISSION_DENIED'

function contactsPermissionError() {
  const error = new Error('연락처를 볼 수 있게 허용해 주시면 이름으로 찾아드려요.')
  error.code = CONTACTS_PERMISSION_DENIED
  return error
}

export async function getContactCandidates(dependencies = {}) {
  const contactsApi = dependencies.contacts ?? Contacts
  const permissions = await contactsApi.checkPermissions()
  if (!isPermissionGranted(permissions.contacts)) {
    const requested = await contactsApi.requestPermissions()
    if (!isPermissionGranted(requested.contacts)) throw contactsPermissionError()
  }

  const { contacts = [] } = await contactsApi.getContacts({
    projection: { name: true, phones: true },
  })

  return contacts.map((contact) => ({
    displayName: contact.name?.display || contact.name?.given || '',
    phoneNumber: contact.phones?.find(({ number }) => number)?.number || '',
  }))
}
