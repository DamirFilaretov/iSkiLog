import { useEffect, useRef, useState } from "react"
import { Image } from "lucide-react"

import {
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  checkGroupDescription,
  checkGroupName,
  normaliseGroupDescription,
  normaliseGroupName
} from "../../features/groups/groupName"
import { GROUP_LOGO_ACCEPTED_TYPES, GROUP_LOGO_MAX_BYTES } from "../../features/groups/groupLogo"
import type { GroupError } from "../../features/groups/groupErrors"

/**
 * Client validation here mirrors the server's rules but is not authoritative
 * (§7). JavaScript and Postgres count characters differently, so the mirror is
 * deliberately the *more permissive* of the two: it gives fast feedback and
 * never blocks a name the database would have accepted. The server decides,
 * and its own message is what gets shown (EC-25).
 *
 * No heading/title is rendered — the dialog carries only an aria-label for
 * assistive tech.
 */

type Props = {
  open: boolean
  submitting: boolean
  /** Set by the parent from the server's answer; cleared on the next edit. */
  serverError: GroupError | null
  onSubmit: (name: string, description: string, isPrivate: boolean, logoFile: File | null) => void
  onClose: () => void
  onClearError: () => void
}

/**
 * Counts what the server would store, not what is in the box: code points
 * (matching `char_length()`, so one emoji is one character) of the normalised
 * value. Counting raw input made the counter disagree with the button — a
 * 40-character name with trailing spaces read "45/40" in red while Create
 * stayed enabled, because validation normalises and the counter did not.
 */
function count(value: string): number {
  return [...value].length
}

export default function CreateGroupModal(props: Props) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [touched, setTouched] = useState(false)

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (props.open) {
      setName("")
      setDescription("")
      setIsPrivate(false)
      setTouched(false)
      setLogoFile(null)
      setLogoError(null)
    }
  }, [props.open])

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(logoFile)
    setLogoPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  if (!props.open) return null

  const nameCount = count(normaliseGroupName(name))
  const descriptionCount = count(normaliseGroupDescription(description))

  const nameProblem = checkGroupName(name)
  const descriptionProblem = checkGroupDescription(description)
  const canSubmit = !nameProblem && !descriptionProblem && !props.submitting

  const nameError =
    (touched ? nameProblem : null) ??
    (props.serverError?.field === "name" ? props.serverError.message : null)
  const descriptionError =
    (touched ? descriptionProblem : null) ??
    (props.serverError?.field === "description" ? props.serverError.message : null)
  const generalError =
    props.serverError && props.serverError.field === null ? props.serverError.message : null

  function edit(next: () => void) {
    props.onClearError()
    next()
  }

  function pickLogo(file: File | null) {
    if (!file) return
    if (!GROUP_LOGO_ACCEPTED_TYPES.includes(file.type)) {
      setLogoError("Use a JPEG, PNG, or WEBP image.")
      return
    }
    if (file.size > GROUP_LOGO_MAX_BYTES) {
      setLogoError("That photo is too large (5 MB max).")
      return
    }
    setLogoError(null)
    setLogoFile(file)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-6 sm:items-center">
      <button
        type="button"
        onClick={props.submitting ? () => {} : props.onClose}
        className="absolute inset-0 bg-black/45"
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="New group"
        className="relative z-10 w-full max-w-md rounded-3xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-center gap-4 rounded-3xl bg-slate-50 p-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={logoPreviewUrl ? "Change group photo" : "Add a group photo"}
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300"
          >
            {logoPreviewUrl ? (
              <img src={logoPreviewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Image className="h-6 w-6" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={e => {
              pickLogo(e.target.files?.[0] ?? null)
              e.target.value = ""
            }}
            className="hidden"
          />

          <input
            type="text"
            value={name}
            onChange={e => edit(() => setName(e.target.value))}
            onBlur={() => setTouched(true)}
            placeholder="Group name"
            aria-label="Name"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-xs">
          <span className="text-red-600">{nameError ?? logoError ?? ""}</span>
          <span className={nameCount > GROUP_NAME_MAX ? "text-red-600" : "text-slate-400"}>
            {nameCount}/{GROUP_NAME_MAX}
          </span>
        </div>

        <div className="mt-4 rounded-3xl bg-slate-50 p-4">
          <textarea
            value={description}
            onChange={e => edit(() => setDescription(e.target.value))}
            onBlur={() => setTouched(true)}
            rows={4}
            placeholder="Weekday evenings at the lake."
            aria-label="Description"
            className="w-full resize-none bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-xs">
          <span className="text-red-600">{descriptionError ?? ""}</span>
          <span
            className={
              descriptionCount > GROUP_DESCRIPTION_MAX ? "text-red-600" : "text-slate-400"
            }
          >
            {descriptionCount}/{GROUP_DESCRIPTION_MAX}
          </span>
        </div>

        <label className="mt-4 flex items-start gap-3">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={e => edit(() => setIsPrivate(e.target.checked))}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600"
          />
          <span className="text-sm">
            <span className="font-medium text-slate-800">Make this group private</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Still findable by other users, but joining needs a code you share.
            </span>
          </span>
        </label>

        {generalError ? <p className="mt-3 text-sm text-red-600">{generalError}</p> : null}

        <button
          type="button"
          onClick={() => props.onSubmit(name, description, isPrivate, logoFile)}
          disabled={!canSubmit}
          className="mt-5 w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {props.submitting ? "Creating..." : "Create group"}
        </button>

        <button
          type="button"
          onClick={props.onClose}
          disabled={props.submitting}
          className="mt-2 w-full rounded-full py-3 text-sm font-medium text-slate-600 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
