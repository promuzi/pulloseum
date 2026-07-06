# Pulloseum (풀로세움)

> A space-botany battle colosseum, built as a single self-contained web game.
> 미래 우주를 배경으로 외계 식물을 탐사·수집·육성해 토너먼트에서 싸우는 웹게임.

**▶ Play now (live): https://promuzi.github.io/pulloseum/**
No install, no build, no sign-up — it runs entirely in the browser and saves to local storage.

---

## What it is

Pulloseum is a browser game where you explore alien planets, collect plant seeds,
raise them through six growth stages, and battle them in a Pokémon-style turn-based
tournament. It blends three genres:

- **Idle / incremental** — plants grow and bear fruit over real time.
- **Turn-based tactical battle** — a Clash-Royale-style loadout of skills, elemental
  type matchups, status effects (poison / burn / bleed / buffs), and mutation cards.
- **Collection & breeding** — 170+ species and variants with procedurally drawn art,
  rarity, traits, and a living in-game codex (Pokédex).

It ships as one `index.html` (~15,000 lines of vanilla HTML/CSS/JS, no framework),
plus a PWA service worker and a Capacitor Android wrapper for mobile.

## Why I built it

I wanted to see how far a **single-file, dependency-free, deterministic** game could go —
a game that anyone can open by double-clicking one HTML file, that has no build step and
no runtime dependencies, yet still supports a deep battle engine, hundreds of creatures,
and offline play. It started as a personal project and is developed fully in the open.

## Features

- **Exploration** — an orbital star map (11 planets / 4 orbits) with per-region species
  distribution, ship upgrades, and fold-travel encounters.
- **Growth & nurture** — 6 growth stages, an idle fruit/harvest loop, and collectible pots
  that modify growth speed and reward tiers.
- **Battle** — 1v1 tournaments (primary) and 3v3 team leagues with a shared energy pool,
  6-skill loadouts, a separate mutation-card bar, deterministic combat resolution, and a
  bot AI with archetype-driven behavior and telegraphed big moves.
- **Species & skills** — 170+ species/variants, 6 mutation forms (weapon / predator /
  toxin / spore / dragon / normal), per-individual signature skills, and 20 traits.
- **Mission / story mode** — authored campaigns with deterministic boss gimmicks.
- **Procedural plant art** — creatures are drawn as composed SVGs (`composePlantSvg`),
  with drop-in PNG sprite overrides for hand-drawn art.
- **Korean localization** — automatic Korean particle (josa) handling for dynamic names.
- **Offline-first** — PWA + local-storage saves; installable, and packaged for Android
  via Capacitor.

## Run it

**Easiest:** double-click `index.html` — the whole game (code + data) is inlined, so it
runs with no server and no dependencies.

**Local server (optional):**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve.ps1 -Port 8765
# → http://localhost:8765
```

**Android build:** see [docs/android-capacitor-wrapper.md](docs/android-capacitor-wrapper.md).

There is no build step. Everything is plain HTML/CSS/JS.

## Project structure

| Path | What it is |
|------|-----------|
| `index.html` | The entire game — CSS, JS, and game data are all inlined. |
| `docs/master-roadmap.md` | Single source of truth for status, direction, and design docs. |
| `docs/` | Design specs, battle/species guides, changelog, balance sheet. |
| `scripts/` | Node generators for species/skills/variant data (idempotent). |
| `tools/` | No-install, browser-based dev utilities (e.g. sprite prep). |
| `assets/`, `data/` | Sprites and reference data. |
| `android/` | Capacitor Android wrapper. |

## Roadmap & maintenance

Active direction lives in **[docs/master-roadmap.md](docs/master-roadmap.md)** (the single
hub). Near-term goals include more species, a pixel-art UI pass, animation/sound, server-
authoritative PvP, and a Google Play release. Development happens in the open with a
documented per-change discipline (code and docs are committed together).

## Tech

Vanilla HTML / CSS / JavaScript · PWA (service worker) · Capacitor (Android) ·
Node scripts for data generation. No framework, no bundler.

## Author

Built and maintained by [@promuzi](https://github.com/promuzi).

## License

See [LICENSE](LICENSE). <!-- TODO: add an OSI license (e.g. MIT) if not present. -->
