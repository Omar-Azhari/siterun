// Device features used by the app. Plugins load on demand and only inside the native
// apps; on the web each helper falls back to the browser API.
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
