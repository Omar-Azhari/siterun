// Device features used by the app. Plugins load on demand and only inside the native
// apps; on the web each helper falls back to the browser API.
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation'
import { isNative } from './platform'

/** Camera or photo library on native. Returns null if cancelled. */
export async function takePhoto(): Promise<File | null> {
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
      quality: 80,
      width: 1600,
      correctOrientation: true,
      promptLabelHeader: 'Add photo',
      promptLabelPhoto: 'Choose from library',
      promptLabelPicture: 'Take photo',
    })
    if (!photo.webPath) return null
    const blob = await (await fetch(photo.webPath)).blob()
    const type = blob.type || `image/${photo.format === 'png' ? 'png' : 'jpeg'}`
    return new File([blob], `photo-${Date.now()}.${photo.format || 'jpg'}`, { type })
  } catch {
    return null // user cancelled or denied permission
  }
}

/** Current position as [lat, lng]. */
export async function currentPosition(): Promise<[number, number]> {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation')
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 })
    return [p.coords.latitude, p.coords.longitude]
  }
  if (!navigator.geolocation) throw new Error('Location unavailable')
  return await new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.latitude, p.coords.longitude]),
      reject,
      { enableHighAccuracy: true, timeout: 8000 },
    ),
  )
}

export interface PositionFix {
  lat: number
  lng: number
  accuracy: number | null
  heading: number | null
  speed: number | null
}

/**
 * Follows the device's position until the returned function is called. `onError` gets a
 * message a driver can act on (for example, location permission is off).
 */
export async function watchPosition(
  onFix: (fix: PositionFix) => void,
  onError: (message: string) => void,
): Promise<() => void> {
  const toFix = (
    c:
      | GeolocationCoordinates
      | {
          latitude: number
          longitude: number
          accuracy: number
          heading?: number | null
          speed?: number | null
        },
  ): PositionFix => ({
    lat: c.latitude,
    lng: c.longitude,
    accuracy: Number.isFinite(c.accuracy) ? c.accuracy : null,
    heading: c.heading != null && Number.isFinite(c.heading) ? c.heading : null,
    speed: c.speed != null && Number.isFinite(c.speed) ? c.speed : null,
  })
  const denied = 'Location access is off. Allow SiteRun to use your location to share it.'

  if (isNative()) {
    // Keeps sending while the driver locks the phone or switches apps. Android shows a
    // notification the whole time, which is what makes that allowed.
    const { registerPlugin } = await import('@capacitor/core')
    const { BackgroundGeolocation } = {
      BackgroundGeolocation: registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation'),
    }
    const id = await BackgroundGeolocation.addWatcher(
      {
        backgroundTitle: 'Sharing your location with SiteRun',
        backgroundMessage: 'The customer can see the truck on their tracking map.',
        requestPermissions: true,
        stale: false,
        distanceFilter: 25,
      },
      (position, error) => {
        if (error) {
          onError(
            error.code === 'NOT_AUTHORIZED'
              ? denied
              : 'Can’t get your location right now. Check GPS is on.',
          )
          return
        }
        if (position) {
          onFix({
            lat: position.latitude,
            lng: position.longitude,
            accuracy: Number.isFinite(position.accuracy) ? position.accuracy : null,
            heading: position.bearing,
            speed: position.speed,
          })
        }
      },
    )
    return () => void BackgroundGeolocation.removeWatcher({ id })
  }

  if (!navigator.geolocation) {
    onError('This browser can’t share its location.')
    return () => {}
  }
  const id = navigator.geolocation.watchPosition(
    (p) => onFix(toFix(p.coords)),
    (err) =>
      onError(
        err.code === err.PERMISSION_DENIED
          ? denied
          : 'Can’t get your location right now. Check GPS is on.',
      ),
    { enableHighAccuracy: true, timeout: 20_000, maximumAge: 5_000 },
  )
  return () => navigator.geolocation.clearWatch(id)
}

/** Saves a file: a download on the web, the Documents folder on native. */
export async function saveFile(blob: Blob, filename: string): Promise<'downloaded' | 'documents'> {
  if (!isNative()) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return 'downloaded'
  }
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
  await Filesystem.writeFile({
    path: filename,
    data,
    directory: Directory.Documents,
    recursive: true,
  })
  return 'documents'
}

/** Light tap feedback on native; nothing on the web. */
export async function haptic(kind: 'success' | 'error' | 'tap' = 'tap') {
  if (!isNative()) return
  const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')
  if (kind === 'tap') await Haptics.impact({ style: ImpactStyle.Light })
  else
    await Haptics.notification({
      type: kind === 'success' ? NotificationType.Success : NotificationType.Error,
    })
}
