// Restore the Sawdust Cinema database from a backup snapshot.
//
//   yarn restore                      # list available snapshots
//   yarn restore <file> --node showings
//   yarn restore <file> --all
//
// Deliberately awkward to use for the whole database: `--all` replaces
// everything, and the reason this repo has a restore script at all is that
// something replaced everything once already. Restoring ONE node is the
// normal case ("the reservations got wiped, put them back") and is what
// --node does.
//
// Nothing is written without --confirm, and the script always prints exactly
// what it is about to do first.

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'

const run = promisify(execFile)
const PROJECT = 'sawdust-cinema'
const DIR = join(homedir(), 'sawdust-cinema-backups')

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--'))
const nodeIndex = args.indexOf('--node')
const node = nodeIndex >= 0 ? args[nodeIndex + 1] : null
const all = args.includes('--all')
const confirm = args.includes('--confirm')

if (!file) {
  if (!existsSync(DIR)) {
    console.error(`No backups yet — run \`yarn backup\`. (${DIR})`)
    process.exit(1)
  }
  console.log(`Snapshots in ${DIR}:\n`)
  readdirSync(DIR).filter((f) => f.endsWith('.json')).sort().reverse()
    .forEach((f) => {
      const data = JSON.parse(readFileSync(join(DIR, f), 'utf8'))
      const s = Object.keys(data.showings || {}).length
      const r = Object.keys(data.reservations || {}).length
      console.log(`  ${f}  —  ${s} showings, ${r} reservations`)
    })
  console.log('\nThen: yarn restore <file> --node reservations --confirm')
  process.exit(0)
}

const path = existsSync(file) ? file : join(DIR, file)
const snapshot = JSON.parse(readFileSync(path, 'utf8'))

if (!node && !all) {
  console.error('Say what to restore: --node <name>, or --all for everything.')
  process.exit(1)
}

const target = all ? '/' : `/${node}`
const value = all ? snapshot : snapshot[node]

if (value === undefined) {
  console.error(`That snapshot has no "${node}" node.`)
  process.exit(1)
}

console.log(`Restore ${target} from ${path}`)
console.log(`  ${Object.keys(value || {}).length} record(s) — this REPLACES whatever is there now.`)

if (!confirm) {
  console.log('\nNothing written. Re-run with --confirm to do it.')
  process.exit(0)
}

const tmp = join(DIR, `.restore-${Date.now()}.json`)
writeFileSync(tmp, JSON.stringify(value))
try {
  await run(
    'firebase',
    ['database:set', target, tmp, '--project', PROJECT, '--force'],
  )
  console.log(`✔ restored ${target}`)
} catch (error) {
  console.error('Restore failed:', String(error.stderr || error.message).trim())
  process.exit(1)
} finally {
  const { unlinkSync } = await import('node:fs')
  try { unlinkSync(tmp) } catch { /* best effort */ }
}
