import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { addYears, format } from 'date-fns'
import { CloudUpload, FileImage, FileText, X } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { Button, DateField, ScreenTitle, Select, Textarea } from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { useApiMutation, useCategories, useMachine, useMe, useRequirements } from '@/data/hooks'
import { validateFile } from './complianceUtils'

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`

/** Board 08 · Upload Document */
export function UploadDocumentPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data: me } = useMe()
  const machineId = params.get('machine')
  const profileId = params.get('profile') ?? (me?.profile.accountType === 'operator' ? me.profile.id : null)
  const machine = useMachine(machineId ?? undefined)
  const reqs = useRequirements()
  const categories = useCategories()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(() =>
    params.get('demo') === '1' ? new File([new Uint8Array(2_400_000)], 'Insurance_Certificate.pdf', { type: 'application/pdf' }) : null,
  )
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [type, setType] = useState(params.get('type') ?? '')
  const [expiry, setExpiry] = useState(params.get('demo') === '1' ? format(addYears(new Date(), 1), 'yyyy-MM-dd') : '')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const upload = useApiMutation((api, v: Parameters<typeof api.uploadDocument>[0]) => api.uploadDocument(v), { success: 'Document uploaded for verification' })

  const options = useMemo(() => {
    const all = reqs.data ?? []
    if (profileId && !machineId) return all.filter((r) => r.group === 'operator')
    const groups = categories.data?.find((c) => c.id === machine.data?.categoryId)?.requirementGroups ?? ['general']
    return all.filter((r) => (groups as string[]).includes(r.group))
  }, [reqs.data, categories.data, machine.data, machineId, profileId])

  const pick = (f: File | undefined) => {
    if (!f) return
    const problem = validateFile(f)
    setError(problem)
    setFile(problem ? null : f)
  }

  const typeError = submitted && !type ? 'Choose a document type' : undefined
  const fileError = error ?? (submitted && !file ? 'Choose a file to upload' : null)
  const back = machineId ? `/supplier/machines/${machineId}/compliance` : profileId === me?.profile.id && me?.profile.accountType === 'operator' ? '/operator/documents' : '/supplier/compliance/alerts'

  const submit = () => {
    setSubmitted(true)
    if (!file || !type || error) return
    upload.mutate({ requirementId: type, machineId, profileId: machineId ? null : profileId, file, expiryDate: expiry || null, notes }, { onSuccess: () => navigate(back, { replace: true }) })
  }

  return (
    <AppScreen hideNav footer={<Button arrow onClick={submit} loading={upload.isPending}>Upload Document</Button>}>
      <ScreenTitle title="Upload Document" subtitle={machine.data ? `For ${machine.data.title} · ${machine.data.make} ${machine.data.model}` : 'Add a clear, readable file of your document.'} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          pick(e.dataTransfer.files[0])
        }}
        aria-describedby="upload-help"
        className={cn(
          'flex w-full flex-col items-center justify-center rounded-[14px] border-2 border-dashed px-4 py-8 text-center transition-colors',
          dragging ? 'border-primary bg-primary/10' : fileError ? 'border-danger' : 'border-line-input hover:border-primary',
        )}
      >
        <CloudUpload className="size-12 text-primary" strokeWidth={1.4} aria-hidden />
        <span className="mt-2 text-base font-semibold">Tap to upload</span>
        <span id="upload-help" className="text-sm text-muted">
          PDF, JPG or PNG (Max 10MB)
        </span>
      </button>
      <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
      {fileError && <p role="alert" className="mt-1 text-xs text-[#f87171]">{fileError}</p>}
      {file && (
        <div className={cn(cardClass, 'mt-3 flex items-center gap-3 p-3')}>
          {file.type === 'application/pdf' ? <FileText className="size-8 fill-danger text-white" strokeWidth={1.2} aria-hidden /> : <FileImage className="size-8 text-primary" aria-hidden />}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{file.name}</span>
            <span className="block text-xs text-muted">{mb(file.size)}</span>
          </span>
          <button type="button" aria-label="Remove file" onClick={() => setFile(null)} className="flex size-10 items-center justify-center rounded-lg hover:bg-white/5">
            <X className="size-5" />
          </button>
        </div>
      )}
      <div className="mt-4">
        <Select label="Document type" placeholder="Choose a document type" value={type} onChange={(e) => setType(e.target.value)} options={options.map((r) => ({ value: r.id, label: r.name }))} error={typeError} />
        <DateField label="Expiry date" value={expiry} min={format(new Date(), 'yyyy-MM-dd')} onChange={setExpiry} hint="Leave blank if the document doesn’t expire." />
        <Textarea label="Notes (optional)" placeholder="Add a note..." rows={2} maxLength={250} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </AppScreen>
  )
}
