import { useEffect, useState } from "react"

import {
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  checkGroupDescription,
  checkGroupName,
  normaliseGroupDescription,
  normaliseGroupName
} from "../../features/groups/groupName"
import type { GroupError } from "../../features/groups/groupErrors"

/**
 * Client validation here mirrors the server's rules but is not authoritative
 * (§7). JavaScript and Postgres count characters differently, so the mirror is
 * deliberately the *more permissive* of the two: it gives fast feedback and
 * never blocks a name the database would have accepted. The server decides,
 * and its own message is what gets shown (EC-25).
 */

type Props = {
  open: boolean
  submitting: boolean
  /** Set by the parent from the server's answer; cleared on the next edit. */
  serverError: GroupError | null
  onSubmit: (name: string, description: string, isPrivate: boolean) => void
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

  useEffect(() => {
    if (props.open) {
      setName("")
      setDescription("")
      setIsPrivate(false)
      setTouched(false)
    }
  }, [props.open])

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
        className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">New group</h2>
        <p className="mt-1 text-sm text-slate-500">
          {isPrivate
            ? "Hidden from the directory. People join with a code you share."
            : "Anyone can find and join a group. Names are unique."}
        </p>

        <label className="mt-5 block">
          <span className="text-xs font-medium text-slate-600">Name</span>
          <input
            type="text"
            value={name}
            onChange={e => edit(() => setName(e.target.value))}
            onBlur={() => setTouched(true)}
            placeholder="Malmö Ski Club"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
          />
          <span className="mt-1 flex items-center justify-between text-xs">
            <span className="text-red-600">{nameError ?? ""}</span>
            <span className={nameCount > GROUP_NAME_MAX ? "text-red-600" : "text-slate-400"}>
              {nameCount}/{GROUP_NAME_MAX}
            </span>
          </span>
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-slate-600">Description (optional)</span>
          <textarea
            value={description}
            onChange={e => edit(() => setDescription(e.target.value))}
            onBlur={() => setTouched(true)}
            rows={3}
            placeholder="Weekday evenings at the lake."
            className="mt-1 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
          />
          <span className="mt-1 flex items-center justify-between text-xs">
            <span className="text-red-600">{descriptionError ?? ""}</span>
            <span
              className={
                descriptionCount > GROUP_DESCRIPTION_MAX ? "text-red-600" : "text-slate-400"
              }
            >
              {descriptionCount}/{GROUP_DESCRIPTION_MAX}
            </span>
          </span>
        </label>

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
              It won't appear in the directory. Anyone with the code can still join — the
              code keeps people from stumbling in, not from getting in.
            </span>
          </span>
        </label>

        {generalError ? <p className="mt-3 text-sm text-red-600">{generalError}</p> : null}

        <button
          type="button"
          onClick={() => props.onSubmit(name, description, isPrivate)}
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
