---
title: A set is a discriminated union — narrow by event
date: 2026-06-19
tags:
  - pattern
  - typescript
  - data-model
---

# A set is a discriminated union — narrow by event

`SkiSet` in [`src/types/sets.ts`](../../../src/types/sets.ts) is a **discriminated union** keyed on `event`:

```ts
type SkiSet =
  | (SetBase & { event: "slalom"; data: SlalomData })
  | (SetBase & { event: "tricks"; data: TricksData })
  | (SetBase & { event: "jump";   data: JumpData })
  | (SetBase & { event: "other";  data: OtherData })
```

`SetBase` carries the shared fields: event, date, optional time of day, season id, favourite flag, and [[notes-are-stored-as-six-structured-sections|structured notes]].

## The pattern: always narrow before touching `data`

```ts
switch (set.event) {
  case "slalom": return renderSlalom(set.data) // data is SlalomData here
  case "tricks": return renderTricks(set.data)
  case "jump":   return renderJump(set.data)
  case "other":  return renderOther(set.data)
}
```

> [!tip] Why this matters
> Accessing `set.data` without narrowing by `event` first gives you the union of all subtype shapes — TypeScript will reject subtype-specific fields. The discriminant maps 1:1 onto the [[the-database-is-postgres-with-rls-and-subtype-tables|subtype tables]] and the [[set-crud-must-go-through-rpcs|RPC payloads]].

## Where this shows up
`AddSet` field components, `SetSummary`, `HistoryItem`, insights selectors, and [[subtype-rpc-payloads-are-shaped-in-one-place|setSubtypeRpcPayload.ts]] all branch on `event`.

## Related
- [[subtype-rpc-payloads-are-shaped-in-one-place]]
- [[one-page-handles-both-create-and-edit]]
