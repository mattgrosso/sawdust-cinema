// One-time: register sawdustcinema.com with Resend so the confirmation
// email can come from tickets@sawdustcinema.com, and print the DNS records
// Resend wants (they go into the Route 53 zone by hand - see APPS.md).
// Reads RESEND_API_KEY from ~/.config/sawdust-cinema/keys.env. Never prints
// the key. Run again to see the verification status.
//
//   node scripts/setup-resend-domain.mjs           # create or show
//   node scripts/setup-resend-domain.mjs --verify  # ask Resend to re-check

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'

const env = Object.fromEntries(readFileSync(`${homedir()}/.config/sawdust-cinema/keys.env`, 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const KEY = env.RESEND_API_KEY
if (!KEY) { console.error('no RESEND_API_KEY in ~/.config/sawdust-cinema/keys.env'); process.exit(1) }
const DOMAIN = 'sawdustcinema.com'
const api = async (path, init = {}) => {
  const r = await fetch(`https://api.resend.com${path}`, { ...init, headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json', ...(init.headers || {}) } })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`${path}: ${r.status} ${body.message || body.name || ''}`)
  return body
}

const list = await api('/domains')
let domain = (list.data || []).find((d) => d.name === DOMAIN)
if (!domain) {
  domain = await api('/domains', { method: 'POST', body: JSON.stringify({ name: DOMAIN, region: 'us-east-1' }) })
  console.log(`created ${DOMAIN} (${domain.id})`)
}
const full = await api(`/domains/${domain.id}`)
if (process.argv.includes('--verify')) { await api(`/domains/${domain.id}/verify`, { method: 'POST' }); console.log('verification requested') }
console.log(`${DOMAIN}: ${full.status}`)
for (const r of full.records || []) console.log(`${r.record.padEnd(5)} ${r.type.padEnd(5)} ${r.name.padEnd(28)} ${r.priority ? `${r.priority} ` : ''}${r.value}  [${r.status}]`)
