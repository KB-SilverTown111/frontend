import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'
import { Contacts } from '@capacitor-community/contacts'
import { Geolocation } from '@capacitor/geolocation'

export async function takeBillPhoto(source = 'camera') {
  return Camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.Uri,
    source: source === 'gallery' ? CameraSource.Photos : CameraSource.Camera,
    allowEditing: false,
    webUseInput: true,
  })
}

export async function photoToBlob(photo) {
  if (photo?.webPath) {
    const response = await fetch(photo.webPath)
    return response.blob()
  }

  if (photo?.path) {
    const response = await fetch(photo.path)
    return response.blob()
  }

  if (photo?.base64String) {
    const binary = atob(photo.base64String)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return new Blob([bytes], { type: `image/${photo.format || 'jpeg'}` })
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

export async function getContactCandidates() {
  const permissions = await Contacts.checkPermissions()
  if (permissions.contacts !== 'granted') {
    const requested = await Contacts.requestPermissions()
    if (requested.contacts !== 'granted') throw new Error('연락처 권한이 필요해요.')
  }

  const { contacts } = await Contacts.getContacts({
    projection: { name: true, phones: true },
  })

  return contacts.map((contact) => ({
    displayName: contact.name?.display || contact.name?.given || '',
    phoneNumber: contact.phones?.find(({ number }) => number)?.number || '',
  }))
}
