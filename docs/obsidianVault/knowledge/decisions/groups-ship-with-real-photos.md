---
title: Groups ship with real photos (D10 superseded)
date: 2026-09-04
tags:
  - decision
  - groups
  - storage
status: active
---

# Groups ship with real photos (D10 superseded)

> [!info] Supersedes D10
> The original design deferred a real group logo/photo — `groups.logo_key`
> existed as a column and flowed end-to-end through every RPC and TS type, but
> was always `null`; `GroupAvatar` rendered initials-on-hashed-color only.
> This turns it on.

A group creator can attach a photo at creation time. It's optional — a group
with no photo still falls back to the initials-on-color circle, now rendered
as a true circle everywhere (was a squircle) so the shape never jumps when a
photo is added.

## What shipped

- **Storage**: a public `group-logos` bucket (migration
  `20260904172428_group_logo_storage.sql`). Public read (photos are shown in
  the directory to non-members too — no signed-URL plumbing). Insert is
  scoped to the caller's own folder: `(storage.foldername(name))[1] =
  auth.uid()::text`.
- **`create_group`** gains a 4th param, `p_logo_key text default null`. The
  old 3-arg overload is dropped (not left dormant) since the signature
  changed. Server-side validation repeats the storage policy's own
  prefix check — `p_logo_key` must start with `{auth.uid()}/` — so a caller
  can never point a group at a photo path they don't own, even though the
  bucket is public-read.
- **Client**: `src/features/groups/groupLogo.ts` (upload + public-URL
  helpers, 5MB / jpeg-png-webp limits). `GroupAvatar` renders the photo with
  an `onError` fallback to initials. `CreateGroupModal` gets a plain
  `<input type="file">` picker — no cropper, no `@capacitor/camera` — a
  circular `object-cover` preview handles any aspect ratio, and Capacitor's
  webview already routes a plain file input to the native OS picker.

## Deliberately out of scope

- **Editing a group's photo/name after creation.** Raised, not built — see
  [[groups-have-no-owner-or-admin-role|D4: no owners]]. The creator has no
  privileges today (`created_by` is a moderation breadcrumb only); adding
  "the creator can edit" would be the first privileged role in a system
  built flat, and raises its own question (what happens once the creator
  leaves or deletes their account — `created_by` is already nullable).
  Needs its own decision before it's built.
- **Moderation/review of uploaded images.** No image content moderation
  exists; only the storage-path ownership check above.
- **Cleanup of orphaned uploads** — an upload can succeed and then
  `create_group` can still fail (rate limit, name taken, denylist). The
  orphaned object under the caller's own folder is an accepted, low-cost
  trade-off, not a bug.

## Related

- [[a-private-group-is-hidden-not-sealed]]
- [[2026-09-04-groups-photos-and-directory-polish]]
