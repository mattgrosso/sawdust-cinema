# sawdust-cinema

## Project setup
```
yarn install
```

### Compiles and hot-reloads for development
```
yarn serve
```

### Compiles and minifies for production
```
yarn build
```

### Lints and fixes files
```
yarn lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

## Backups

**`yarn backup`** snapshots the whole database to `~/sawdust-cinema-backups/`
(kept: 30). It also runs automatically before every `yarn deploy`.
**`yarn restore`** lists snapshots; `yarn restore <file> --node reservations
--confirm` puts one node back.

This exists because on 2026-08-28 an automated cleanup step built a delete
path from an empty variable and removed the entire `reservations` node — 19
real guests' RSVPs — from the live database. There was no backup, this
project is on the free plan (no automatic snapshots), and the site sends no
RSVP email, so the data was unrecoverable. Two guards came out of it: the
backup script refuses to overwrite good snapshots with an empty read, and the
restore script writes nothing without `--confirm`.

## Database rules

`database.rules.json`, deployed with `firebase deploy --only database
--project sawdust-cinema`. The root is default-deny; `showings` and
`reservations` are the only nodes a client can touch, and a reservation must
look like one (capped strings).

**Known and unfixed:** `reservations` is still publicly readable, so guests'
names and emails are exposed. Closing it needs two things together — the PII
split out of `reservations` (the public page reads that node for its
"N spots left" counts) and the admin page behind a real login instead of the
password constant in the bundle. Firebase Auth has never been initialized on
this project, so that starts with enabling Google sign-in in the console.
