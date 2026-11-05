// The reply half of the bug button: `yarn resolve-bug-report <id>
// --understood ... --fixed ...` writes a plain-language notice under the
// reporter's uid at bugReportResolutions, and BugResolutionNotice.vue shows
// it once on their next visit. The uid is the silent anonymous session
// utils/bugreport.js minted, which persists in the browser. Rules: only that
// uid can read its node; the only client write is flipping `seen`.

import { currentUid, readResolutions, markResolutionsSeen as markSeen } from '@/firebase'

const APP = 'sawdust-cinema'

/** This app's unseen notices, oldest first. */
export const unseenResolutions = (entries, app = APP) =>
  Object.entries(entries || {})
    .filter(([, value]) => value && !value.seen && (!value.app || value.app === app))
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => (a.resolvedAt || 0) - (b.resolvedAt || 0))

export const fetchUnseenResolutions = async () => {
  const uid = currentUid()
  if (!uid) return []
  try {
    return unseenResolutions(await readResolutions(uid))
  } catch {
    // Offline or refused - the notice simply waits for another visit.
    return []
  }
}

export const markResolutionsSeen = async (ids) => {
  const uid = currentUid()
  if (!uid || !ids?.length) return
  try {
    await markSeen(uid, ids)
  } catch {
    // Marked on a later dismissal instead.
  }
}
