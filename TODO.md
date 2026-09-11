# Jumpy — Engagement & Retention TODO

Ideas for making the game more addictive/enjoyable, ranked roughly by impact vs. effort.

## 1. Persist stats across sessions (highest priority)
Currently `best`, `bestHeight`, `bestTimeMs` ([js/setup.js](js/setup.js)) and `raceWins` ([js/ui.js](js/ui.js))
are plain JS variables — a page reload wipes them. Only the mute toggle is saved
(`js/audio.js`). Save to `localStorage`:
- Best score, best height, best time (classic)
- Career totals: total flags collected, total runs, total distance climbed
- Race/duel win tally (currently session-only via `raceWins`)

## 2. Achievements / milestones
One-time unlockable goals beyond "beat your last score", e.g.:
- Climb 1000m / 5000m / 10000m
- Collect 100 / 500 flags total
- Win 10 duels / 10 races
- Complete a run without using a shield
Show a celebratory banner (reuse `showReward()` pattern) on first unlock.

## 3. Cosmetic unlocks
Tie ball skins, trail colors, or crowd/stadium themes to achievements or
career totals — gives a reason to keep playing after topping your best run.

## 4. "So close!" near-miss messaging on death
On game over, surface near-misses using data already tracked
(`flagCountsByCountry`, `cameraY`), e.g.:
- "1 flag from a MEGA BOOST!"
- "12m from your best!"
Classic "one more try" hook, cheap to add since the data already exists.

## 5. Daily streak / daily challenge
A small daily login bonus or a seeded daily run/seed so players can compare
runs with the same layout.

## 6. Share / copy score card at game-over
Generate a shareable text/image summary (score, distance, flags) — free
viral loop, no backend needed.

## 7. Haptics on mobile
`navigator.vibrate()` on jump / boost / death for a meatier feel on touch
devices — cheap addition to the existing touch zones (`js/ui.js`).
