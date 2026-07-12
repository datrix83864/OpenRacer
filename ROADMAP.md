# OpenRacer — Road to 1.0

Work through these tasks **in order** (later prompts assume earlier ones landed on `main`).
Each task has a suggested model and a self-contained prompt to paste into a fresh Claude Code session.

**Model guide:** Opus = protocol/architecture/integration work where judgment matters. Sonnet = well-scoped feature work with a clear definition of done.

Target requirements (acceptance criteria for "done"):

- Offline-first; save a race to a thumbdrive, open it on another computer to upload/print results
- Operator flow: a racer can start/finish and the scoreboard result displays **while** the new-racer modal is open; auto-increment bib numbers; racer lookup prioritizes local DB, fills in from global info
- Import new racers via spreadsheet; export their generated racer IDs afterward
- Customizable courses, printing, logos
- Easy auditing of results (raw impulse log is ground truth)
- Auto-update, including update-from-USB
- Impulses from Alge-Timing TED2 (USB serial); scoreboard via USB→RS-232

---

## Task 1 — Consolidate branches and get tests green

**Model: Sonnet** · Do this first; everything else builds on it.

```
In C:\Users\Dalton\Documents\GitHub\OpenRacer (Electron ski race timing app):
The real work lives on branch claude/focused-sagan-bFp9n, which contains develop,
which contains main — so both merges should be fast-forwards. Merge
claude/focused-sagan-bFp9n into develop, then develop into main, and push all
branches. Then run `npm install` (branch package.json adds serialport,
@electron/rebuild, jest-environment-jsdom) and `npm test`. Fix every failing
test so the suite is green — the tests were written against the feature-branch
code, so most failures should resolve after the merge; fix genuine breakage in
source or tests as appropriate, but do not delete tests to make them pass.
While you're in there: delete the tutorial boilerplate in utils/calculations.js
(add/subtract/multiply/divide) and its test, and remove or implement the empty
modules/results.js stub — check what imports them first. Verify the app still
launches with `npm start`. Commit in logical chunks.
```

## Task 2 — TED2 protocol driver (the heart of the system)

**Model: Opus** · Highest-risk, highest-value task.

```
In C:\Users\Dalton\Documents\GitHub\OpenRacer (Electron ski race timing app, work on main):
modules/hardware.js currently reads generic newline-delimited serial for the
timing gate and timestamps impulses with Date.now() at receipt. Replace this
with a real driver for the Alge-Timing TED2 (USB serial receiver that forwards
timing impulses). Research the Alge RS-232 protocol first — fetch the TED2 /
Alge-Timing manuals online (alge-timing.com has PDF manuals; the classic Alge
frame looks like `NNNN CxM HH:MM:SS.ffff GG` where Cx is the channel — C0
start, C1 finish, etc.) and verify frame format, baud rate (typically 9600 8N1),
and channel semantics against the actual documentation, not memory.

Requirements:
1. A TED2Driver (or AlgeProtocolDriver) that parses frames into
   { channel, timeOfDay, raw, receivedAt } events. Tolerate partial/garbled
   frames without crashing.
2. Timing must use the DEVICE's time-of-day from the frame, not PC receipt
   time. Compute run time as finish TOD minus start TOD. modules/race-timing.js
   currently uses Date.now() epoch ms for startTime/finishTime — extend it to
   accept device time-of-day timestamps while keeping manual (keyboard) timing
   working. Handle midnight rollover.
3. Channel mapping must be configurable in the hardware settings UI
   (ui/components/dual-timing-panel.js has showHardwareSettings()): map each
   Alge channel (C0–C9) to start/finish of left/right course.
4. Log EVERY raw impulse (parsed or not) to an append-only impulse log file
   (JSONL, one file per day, in userData) — this is the audit ground truth.
   Include an ipc handler to read the log.
5. Keep the existing generic line-based driver as a fallback "generic serial"
   device type; make the driver selectable per port in settings.
6. Unit tests for the frame parser (valid frames, garbage, partial frames,
   midnight rollover) and for device-time run calculation.

Test with `npm test`, and verify the app launches. You won't have the physical
device — add a dev-only "simulate impulse" affordance (IPC or settings button)
so the full start→finish→scoreboard flow can be exercised without hardware.
Commit in logical chunks.
```

## Task 3 — Scoreboard output driver (RS-232)

**Model: Opus**

```
In C:\Users\Dalton\Documents\GitHub\OpenRacer (Electron ski race timing app, work on main):
modules/hardware.js sends plain padded text to the scoreboard serial port.
Real RS-232 scoreboards need their own protocols. Restructure scoreboard
output as pluggable formatters:

1. A ScoreboardFormatter interface: running-time display, final run result
   (bib/rank/time), leaderboard page, clear.
2. Implementations: (a) the existing generic-text formatter, (b) the Alge GAZ
   / d-line protocol (research the actual protocol from alge-timing.com
   manuals — verify frame layout against documentation, don't trust memory),
   selectable in hardware settings along with port/baud.
3. Wire scoreboard updates into the race flow in main.js: when a run finishes,
   push the result + rank automatically; while a run is active, optionally
   push running time (throttle to what the protocol supports, e.g. 10 Hz max,
   make the rate configurable). Critically: scoreboard output must never block
   or crash the timing flow — wrap writes so a disconnected scoreboard is a
   logged warning, not an error dialog.
4. A "test scoreboard" button in hardware settings that sends a sample frame.
5. Unit tests for each formatter's byte output.

Run `npm test` and verify the app launches. Commit in logical chunks.
```

## Task 4 — Spreadsheet import/export of racers

**Model: Sonnet**

```
In C:\Users\Dalton\Documents\GitHub\OpenRacer (Electron ski race timing app, work on main):
modules/racer-database.js supports only JSON import/export. Add spreadsheet
support for race-day registration:

1. Import racers from CSV and XLSX (use a well-maintained lib like `xlsx` or
   csv-parse; xlsx covers both). Show a column-mapping step in the UI: parse
   the header row, let the operator map columns to firstName, lastName, gender,
   dob/age, discipline, email, phone, bibNumber (all optional except names).
   Unmapped columns are ignored. Preview the first few rows before confirming.
2. On import, generate racer IDs via the existing generateRacerId(), assign
   auto-increment bibs (getNextBibNumber()) for rows without one, and add
   everyone to today's racers + local cache. Report count + any skipped rows.
3. Export "today's racers with IDs" back to CSV/XLSX — same columns as
   imported plus the generated racer ID and bib — so registration staff can
   round-trip the file. Save-dialog like the existing racers:export handler in
   main.js.
4. Wire into the UI (there's a racer list component in ui/components/
   racer-list.js and IPC patterns in main.js/preload.js to follow).
5. Tests for the import mapping logic (header detection, missing columns,
   duplicate bibs, empty rows).

Run `npm test` and verify in the running app with a sample CSV. Commit in
logical chunks.
```

## Task 5 — Printing with logos and templates

**Model: Opus** (layout/architecture) — or Sonnet if scoped tightly.

```
In C:\Users\Dalton\Documents\GitHub\OpenRacer (Electron ski race timing app, work on main):
There is currently no printing. Add a print system for race results:

1. A print template: printable HTML page (separate BrowserWindow or hidden
   webContents) rendering: event header with a customizable logo image and
   mountain/event name, course name(s), date, then the results table (rank,
   bib, name, category, raw time, adjusted time, score, status incl. DNF/DSQ)
   from the existing scoring engine (modules/scoring.js) and leaderboard data.
   Support printing overall or per-category results.
2. Settings for print customization stored in the app config (main.js
   loadConfig/saveConfig): logo file path (copy the image into userData so it
   travels with the config), event name, footer text.
3. Print via webContents.print() AND "Save as PDF" via printToPDF — the PDF
   path matters because results may be printed from a different computer
   (thumbdrive workflow).
4. Also add an individual racer result slip template (bib, name, time, rank,
   score) — operators hand these out at NASTAR-style events.
5. A Print button in the results/leaderboard UI (ui/components/leaderboard.js).
6. Keep templates as data (HTML template files), not string concat in code,
   so they're customizable later.

Verify by generating a PDF with sample data. Commit in logical chunks.
```

## Task 6 — Thumbdrive race package workflow

**Model: Sonnet**

```
In C:\Users\Dalton\Documents\GitHub\OpenRacer (Electron ski race timing app, work on main):
modules/export.js already has exportToPackage/importFromPackage (portable JSON
with runs + racers + formula). Build the guided thumbdrive workflow on top:

1. "Save Race to USB" flow: file-save dialog defaulting to a removable drive
   if one exists (list drives; on Windows check drive type), writing a single
   .orpkg (JSON) file named <event>-<date>.orpkg containing runs, racers,
   scoring formula, course config, print settings, and the day's impulse log
   if present.
2. "Open Race from USB" flow: open the package on another machine in a
   read-only "review mode" — leaderboard, audit view, print, and export all
   work; timing controls are disabled unless the operator explicitly chooses
   "continue this race here" (which imports it as the active race).
3. Guard against data loss: opening a package while a local race has data
   prompts to save first; never silently overwrite.
4. Add both actions to the welcome screen (index.html has "Load Previous
   Race" as a dead button — wire it to this) and a menu.
5. Tests for package round-trip fidelity (export → import → deep-equal on
   runs/racers/settings).

Run `npm test` and verify the full flow in the app. Commit in logical chunks.
```

## Task 7 — Audit view

**Model: Sonnet**

```
In C:\Users\Dalton\Documents\GitHub\OpenRacer (Electron ski race timing app, work on main):
Results need to be auditable. Runs already carry timestamps, penalties, and
DNF/DSQ reasons; Task 2 added an append-only raw impulse log (JSONL in
userData). Add an audit view:

1. New "Audit" tab/panel: chronological table of every impulse (device time,
   channel, course, action, matched run/bib or "unmatched") merged with run
   lifecycle events (started, finished, DNF, DSQ, penalty added, time edited).
2. Every manual mutation of a result (penalty, DSQ, DNF, manual finish, any
   future time edit) must append to an audit trail on the run record — who/
   when/what changed, old → new value. Extend modules/race-timing.js to record
   this on each mutating method.
3. Click a run in the audit view to see its full history and the raw impulses
   that produced its times.
4. Export the audit log (CSV) alongside results, and include it in the
   thumbdrive package.
5. Tests: mutations append audit entries; the view's merge logic orders events
   correctly.

Run `npm test` and verify in the app. Commit in logical chunks.
```

## Task 8 — Real auto-update + USB update

**Model: Opus**

```
In C:\Users\Dalton\Documents\GitHub\OpenRacer (Electron ski race timing app, work on main):
The update system (main.js) checks GitHub releases and shows a dialog, but
"Download in Background" and "Install from USB" are placeholders that install
nothing. Make updates real:

1. Adopt electron-updater (works with electron-builder's NSIS target and
   GitHub releases provider). Wire: check → download with progress →
   install-on-restart, and "download now" vs "on next restart" choices in the
   existing modal. Keep the skip-version behavior.
2. USB/offline path: "Install from file" should verify the chosen file is a
   newer OpenRacer installer (check version from the filename or blockmap,
   and verify the file's code signature or at minimum its SHA-512 against
   latest.yml if the user also copied that), then launch the installer and
   quit. Document in README what to copy onto the USB stick (installer +
   latest.yml).
3. Handle the portable-exe case: portable builds can't self-update in place —
   detect it and instead offer "download new portable exe to a folder you
   choose".
4. The update check must never interrupt an active race: if runs are active,
   defer any prompt.
5. Update the GitHub publish config in package.json (repo: datrix83864/
   openracer per the existing UPDATE_CHECK_URL) and document the release
   process (tag, build, upload artifacts + latest.yml).

You can't fully test an update round-trip without published releases — verify
what you can (dev-mode simulation, unit tests for the version/verify logic)
and document the manual test plan. Commit in logical chunks.
```

## Task 9 — Settings, courses, and polish

**Model: Sonnet**

```
In C:\Users\Dalton\Documents\GitHub\OpenRacer (Electron ski race timing app, work on main):
Consolidate configuration and finish rough edges:

1. A real Settings screen (the header Settings button currently only shows
   course/hardware settings from within the timing panel): mountain/event
   name, logo (shared with print settings), course names/colors, scoring
   formula + categories (modules/scoring.js), waiver requirement + season
   start (modules/racer-database.js reads these from constructor options —
   wire them to config instead of the hardcoded TODOs in main.js), hardware
   (existing panel), update preferences.
2. mountainId is hardcoded to 'default-mountain' in main.js — drive it from
   settings; racer DB files are keyed by it.
3. Remove or complete the subscription/cloud-sync placeholder paths (racers:
   sync-cloud, subscription status UI in renderer.js) — for 1.0, hide them
   behind a "coming soon" flag rather than showing Expired/Premium states.
4. First-run experience: on a fresh install, prompt for mountain name and
   walk through hardware setup.
5. Sweep for dead UI (buttons that only show "coming soon" notifications)
   and either wire or remove them.

Run `npm test`, verify the app end-to-end, commit in logical chunks.
```

## Task 10 — Operator-flow verification and race-day dry run

**Model: Opus** · The final gate before calling it done.

```
In C:\Users\Dalton\Documents\GitHub\OpenRacer (Electron ski race timing app, work on main):
Do a full race-day dry run against the acceptance criteria in ROADMAP.md and
fix what fails. Use the dev impulse simulator (from the TED2 task) for
hardware. Script to verify end-to-end:

1. Fresh start: import a spreadsheet of 10 racers, export their IDs back out.
2. Start racer A (simulated start impulse). While A is on course, open the
   new-racer modal and begin typing a new racer. Fire A's finish impulse:
   A's time and scoreboard output MUST update while the modal stays open and
   focused — this exact scenario is a core requirement. Fix any modal that
   blocks background updates.
3. Auto-increment bib on the new racer; save; look up a returning racer and
   confirm local-DB data pre-fills.
4. Run two racers simultaneously on left/right courses; DNF one via the
   picker; add a penalty; verify audit trail records everything.
5. Print results to PDF with a logo; save the race package "to USB" (any
   folder); open it on a simulated second machine (fresh userData via
   --user-data-dir or temp config) and print from there.
6. Verify offline behavior: everything above with network checks failing.
7. Build the Windows portable exe (npm run build:portable) and smoke-test it.

Fix every failure you find, keep `npm test` green, and write the results as a
RACE-DAY-CHECKLIST.md the operator can reuse. Commit in logical chunks.
```

---

## Suggested session order

| # | Task | Model | Depends on |
|---|------|-------|------------|
| 1 | Branch merge + green tests | Sonnet | — |
| 2 | TED2 driver + impulse log | Opus | 1 |
| 3 | Scoreboard formatters | Opus | 2 |
| 4 | Spreadsheet import/export | Sonnet | 1 |
| 5 | Printing + logos | Opus | 1 |
| 6 | Thumbdrive package flow | Sonnet | 2 (impulse log), 5 (print settings) |
| 7 | Audit view | Sonnet | 2 |
| 8 | Real auto-update + USB | Opus | 1 |
| 9 | Settings consolidation | Sonnet | 3, 5 |
| 10 | Race-day dry run + build | Opus | all |

Tasks 4, 5, and 8 are independent of the hardware track (2→3) and can run in
parallel sessions if desired.

Open question to resolve before Task 3: **which scoreboard model?** The prompt
assumes Alge GAZ/d-line; swap in the real protocol if it's a different board.
