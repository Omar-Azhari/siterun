import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CirclePlus, Loader2, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui'
import { cn } from '@/lib/cn'
import { getApi } from '@/data/client'
import { useApiMutation } from '@/data/hooks'
import { compressImage, isEditable, stepPath, useListing } from './listingShared'
import { ListingGate, WizardFrame } from './WizardFrame'

const MAX = 10

/** Board 07 · Step 3: photos (upload, delete, reorder; first photo is the main photo). */
export function PhotosStep() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const q = useListing(id)
  const m = q.data
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const save = useApiMutation((api, photos: string[]) => api.saveMachineDraft(id, { photos }))
  const next = useApiMutation((api) => api.saveMachineDraft(id, { draftStep: 3 }))

  if (!isEditable(m)) return <ListingGate query={q} machine={m} />
  const photos = m.photos

  const upload = async (files: File[]) => {
    const room = MAX - photos.length
    if (room <= 0) return toast.error('Photo limit reached', `You can add up to ${MAX} photos.`)
    const chosen = files.filter((f) => f.type.startsWith('image/')).slice(0, room)
    if (files.length > room) toast.info(`Only ${room} more photo${room === 1 ? '' : 's'} added`, `Listings can have up to ${MAX} photos.`)
    setUploading(chosen.length)
    try {
      const urls: string[] = []
      for (const f of chosen) {
        urls.push(await getApi().uploadMachinePhoto(id, await compressImage(f)))
        setUploading((n) => n - 1)
      }
      save.mutate([...photos, ...urls])
    } catch (e) {
      toast.error('Upload failed', (e as Error).message)
    } finally {
      setUploading(0)
    }
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length || from === to) return
    const list = [...photos]
    const [item] = list.splice(from, 1)
    if (item) list.splice(to, 0, item)
    save.mutate(list)
  }

  const remove = (i: number) => save.mutate(photos.filter((_, n) => n !== i))

  const tile = (src: string, i: number) => (
    <li
      key={`${src.slice(-24)}-${i}`}
      draggable
      onDragStart={() => setDragFrom(i)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => {
        if (dragFrom !== null) move(dragFrom, i)
        setDragFrom(null)
      }}
      className={cn('group relative overflow-hidden rounded-[12px] border border-line bg-input', i === 0 ? 'col-span-2 aspect-[16/10]' : 'aspect-[4/3]', dragFrom === i && 'opacity-50')}
    >
      <img src={src} alt={i === 0 ? 'Main photo' : `Photo ${i + 1}`} className="size-full cursor-grab object-cover" />
      {i === 0 && <span className="absolute bottom-2 left-2 rounded-md bg-app/85 px-2 py-1 text-xs font-medium">Main photo</span>}
      <button type="button" aria-label={`Delete photo ${i + 1}`} onClick={() => remove(i)} className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-lg bg-app/80 hover:bg-danger">
        <Trash2 className="size-4" />
      </button>
      <div className="absolute right-2 bottom-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        {i > 0 && (
          <button type="button" aria-label={`Move photo ${i + 1} earlier`} onClick={() => move(i, i - 1)} className="flex size-8 items-center justify-center rounded-lg bg-app/80 hover:bg-primary">
            <ArrowLeft className="size-4" />
          </button>
        )}
        {i < photos.length - 1 && (
          <button type="button" aria-label={`Move photo ${i + 1} later`} onClick={() => move(i, i + 1)} className="flex size-8 items-center justify-center rounded-lg bg-app/80 hover:bg-primary">
            <ArrowRight className="size-4" />
          </button>
        )}
      </div>
    </li>
  )

  return (
    <WizardFrame
      step="photos"
      title="Photos"
      subtitle="Add clear photos of your machine from multiple angles."
      disabled={photos.length === 0 || uploading > 0}
      saving={next.isPending}
      onContinue={() => next.mutate(undefined, { onSuccess: () => navigate(stepPath(id, 'specs')) })}
    >
      <ul className="grid grid-cols-2 gap-2.5" aria-label={`${photos.length} of ${MAX} photos. Drag to reorder.`}>
        {photos.map(tile)}
        {Array.from({ length: uploading }, (_, i) => (
          <li key={`up-${i}`} className="flex aspect-[4/3] items-center justify-center rounded-[12px] border border-line bg-input">
            <Loader2 className="size-6 animate-spin text-primary" aria-label="Uploading" />
          </li>
        ))}
        {photos.length + uploading < MAX && (
          <li className={cn(photos.length === 0 ? 'col-span-2 aspect-[16/10]' : 'col-span-2 h-28')}>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                void upload([...e.dataTransfer.files])
              }}
              className="flex size-full flex-col items-center justify-center gap-1.5 rounded-[12px] border-2 border-dashed border-primary/60 text-primary hover:bg-primary/5"
            >
              <CirclePlus className="size-8" strokeWidth={1.5} aria-hidden />
              <span className="text-sm font-medium">Add photo</span>
              <span className="text-xs text-muted">{photos.length}/{MAX} · JPG or PNG</span>
            </button>
          </li>
        )}
      </ul>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          void upload(files)
        }}
      />
      <p className="mt-3 text-xs text-muted">Drag photos to reorder. The first photo is shown in search results.</p>
    </WizardFrame>
  )
}
