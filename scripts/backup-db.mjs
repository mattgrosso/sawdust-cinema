// Full backup of the Sawdust Cinema database.
//
//   yarn backup            # snapshot -> ~/sawdust-cinema-backups/
//   yarn backup --quiet    # one line of output (used by predeploy)
//   yarn restore <file>    # see restore-db.mjs
//
// WHY THIS EXISTS, plainly: on 2026-08-28 an automated cleanup step built a
// delete path from an empty variable and removed the entire `reservations`
// node — 19 real guests' RSVPs — from the live database. There was no backup
// of any kind, no paid-tier automatic snapshot, and no email trail, so the
// data was simply gone. Every other database in this fleet (Cinema Roll,
// Movie Hat) has had a backup script for months; this one, holding actual
// customers' names and email addresses, had none.
//
// Reads through the Firebase CLI rather than a service-account key: this repo
// has never had one, the CLI's project-owner login already works here (it is
// how `reservations` is triaged), and adding a key file to a brochure site is
// more secret to look after than the job needs.
//
// The whole database is a handful of showings and RSVPs, so this takes a
// fraction of a second and there is no reason not to run it often.

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const run = promisify(execFile)
const PROJECT = 'sawdust-cinema'
const DIR = join(homedir(), 'sawdust-cinema-backups')
const KEEP = 30

const quiet = process.argv.includes('--quiet')
const log = (message) => { if (!quiet) console.log(message) }

let data
try {
  const { stdout } = await run(
    'firebase',
    ['database:get', '/', '--project', PROJECT],
    { maxBuffer: 64 * 1024 * 1024 },
  )
  data = JSON.parse(stdout || 'null')
} catch (error) {
  console.error('Backup FAILED — could not read the database.')
  console.error('Is `firebase login` still valid?')
  console.error(String(error.stderr || error.message).trim())
  process.exit(1)
}

// A read that succeeds but returns nothing is the shape a catastrophe takes.
// Refuse to write it over the top of good snapshots.
if (!data || typeof data !== 'object' || !Object.keys(data).length) {
  console.error('Backup REFUSED: the database read back empty.')
  console.error('That is either a genuine emptying or a broken read — either way,')
  console.error('writing an empty snapshot would bury the last good one.')
  process.exit(1)
}

mkdirSync(DIR, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const name = `sawdust-${stamp}.json`
writeFileSync(join(DIR, name), JSON.stringify(data, null, 2))

const showings = Object.keys(data.showings || {}).length
const reservations = Object.keys(data.reservations || {}).length
log(`✔ ${name} — ${showings} showings, ${reservations} reservations`)

// Keep the most recent KEEP snapshots.
const snapshots = readdirSync(DIR)
  .filter((f) => f.startsWith('sawdust-') && f.endsWith('.json'))
  .map((f) => ({ f, at: statSync(join(DIR, f)).mtimeMs }))
  .sort((a, b) => b.at - a.at)
if (snapshots.length > KEEP) {
  const { unlinkSync } = await import('node:fs')
  snapshots.slice(KEEP).forEach(({ f }) => unlinkSync(join(DIR, f)))
}
