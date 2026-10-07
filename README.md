# LIFE RPG — Turn Your Life Into a Game

A production-ready life gamification dashboard: your real actions become XP, levels,
character stats, quests, habits, goals, achievements and analytics.

> **My life is the game.**

![stack](https://img.shields.io/badge/React-19-0b0f14?logo=react)
![stack](https://img.shields.io/badge/TypeScript-5.9-0b0f14?logo=typescript)
![stack](https://img.shields.io/badge/Vite-7-0b0f14?logo=vite)
![stack](https://img.shields.io/badge/Tailwind-4-0b0f14?logo=tailwindcss)

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build -> dist/
npm run preview  # preview the production build
```

Works on Windows, macOS and Linux with Node 18+.

## Install on your phone (PWA)

LIFE RPG is a full Progressive Web App and installs like a native app.

**Android (Chrome / Edge / Samsung Internet)**
open the site → a prompt appears after a few seconds → **Установить**.
Or: browser menu → *Install app* / *Add to Home screen*.

**iPhone / iPad (Safari)**
open the site in **Safari** → **Поделиться** → **На экран «Домой»** → **Добавить**.
(LIFE RPG shows these steps automatically in *Настройки → Установка*.)

After install it launches from the home screen in full-screen mode (no browser bar),
uses the LIFE RPG icon, keeps your safe-area insets, and works **offline** — all data
lives in local storage and the app shell is cached by a service worker.

Long-pressing the icon offers **quick shortcuts**: Матрица привычек, Квесты, AI-тренер.

### What makes it installable

| Piece | File |
| --- | --- |
| Web app manifest | `public/manifest.webmanifest` |
| Service worker (offline shell) | `public/sw.js` |
| Vector mark | `public/icons/mark.svg`, `mark-mono.svg` |
| App icons 96/150/180/192/512 | `public/icons/*.png` |
| Maskable icons 192/512 | `public/icons/icon-maskable-*.png` |

Icons are rasterised from the hand-drawn SVG mark, so they stay crisp at every size.

**Requirement:** the site must be served over **HTTPS** (Vercel, Netlify and GitHub Pages
all do this out of the box). `localhost` also counts as secure for local testing.

```bash
npm run build
npm run preview   # http://localhost:4173 — PWA works here for local testing
```

> If a host serves only `index.html`, the app still runs and can still register a
> fallback manifest, but offline caching needs the `sw.js` file to be served too.
> Deploy the whole `dist/` folder (the default on Vercel) to get full offline support.

## Deploy

The build output is a static `dist/` folder — deploy it anywhere:

- **Vercel / Netlify**: import the repo, framework preset **Vite**, build `npm run build`, output `dist`.
- **GitHub Pages**: publish `dist/`.

## Features

| Area | What you get |
| --- | --- |
| **Character** | Avatar, level, XP ring, 8 stats (STR, INT, DISC, CAREER, FIN, HEALTH, KNOW, SOCIAL), rank, titles, character points |
| **XP system** | Multiplied rewards (streak, level, daily-first bonuses), XP history, full traceability |
| **Levels** | Level curve, level-up cinematic, +1 character point, +2% XP multiplier per level |
| **Quests** | Daily / Weekly / Monthly / Main / Side, 4 difficulties, deadlines, progress steps, edit + delete |
| **Habits** | Streaks, best streak, completion %, per-habit calendar, top-10 consistency ranking |
| **Habit Matrix** | Month grid with sticky habit column, week sections, search/filter/sort, progress by day & week, top-10 / most-missed rankings, streak dashboard, activity heatmap, monthly report, month-over-month comparison |
| **Goals** | Big life goals with milestones that drive progress automatically |
| **Achievements** | 19 trophies with rarity, progress bars, unlock dates, glow states |
| **Calendar** | Month heatmap of XP/quests/habits/achievements, daily summary, mood logging, daily score |
| **Analytics** | XP growth, level progression, habit completions, daily score, weekday activity, finance bars — all responsive SVG charts |
| **Finance** | Income/expense tracking, 11 expense categories, savings rate, monthly analytics, finance XP |
| **AI Coach** | Chat interface with quick prompts, typing animation, `aiService` layer with env-based API + honest on-device fallback |
| **Settings** | Profile, appearance (dark/light/system), notifications, data export/import/reset, AI config, privacy |

## Architecture

```
src/
├─ components/
│  ├─ ui/          Button, Card, Form, Modal, Progress, Feedback, Icon
│  ├─ charts/      LineChart, BarChart, DonutChart (dependency-free SVG)
│  ├─ layout/      AppShell, Sidebar, BottomNav, nav config
│  ├─ forms/       Global quest / habit / goal / transaction composer
│  ├─ rpg/         CharacterCard, StatCard, Avatar, GameFX, NotificationCenter
│  ├─ quests/ habits/ goals/   Domain item components
├─ pages/          One file per route (lazy loaded)
├─ lib/            xp math, selectors, habitPlan, habitMatrix, achievements, dates, formatting, demo data
├─ services/       aiService (env-configured API + local analyst)
├─ store/          GameContext (state, XP engine, persistence), UIContext (router, composer)
└─ types.ts        Domain model
```

**Habit planning model.** `lib/habitPlan.ts` decides whether a day was *planned* for a habit
(start date, frequency, weekdays, pause window, archived state). Only planned days feed completion
rates, so future days, rest days and paused days are never counted as "missed".

**Single source of truth.** Every number in the UI is derived through `lib/selectors.ts` and `lib/habitMatrix.ts`
from one `AppData` object. Completing a habit → XP → level → achievement → analytics is a
single atomic reducer transaction in `store/GameContext.tsx`.

## Data & privacy

Everything is stored in `localStorage` (`life-rpg.state.v1`). No backend, no tracking.
Use **Settings → Data** to export a JSON backup, import it on another device, or reset.

## AI Coach configuration (optional)

Create `.env.local`:

```
VITE_AI_API_KEY=your_key
VITE_AI_API_URL=https://api.openai.com/v1/chat/completions
VITE_AI_MODEL=gpt-4o-mini
```

Without a key the coach clearly states that the AI connection is not configured and answers
from a deterministic on-device analyst. No keys are hardcoded anywhere.

## Habit Matrix

The Habit Matrix is the control panel of the system. One reducer action (`TOGGLE_HABIT`) updates, in a
single transaction:

```
cell → XP (base × streak bonus) → stat XP for every linked stat → level
     → current/best streak → linked quest progress → achievements
     → daily score → Life Score → analytics → AI coach context
```

Un-completing a cell reverses the exact same chain (per-stat XP is stored on each activity event, so
reversal is precise and never produces negative XP or NaN). Achievement XP is permanent by design.

Streak XP ladder: 3 days +5% · 7 days +10% · 14 days +15% · 30 days +25%.

Habits can be **active / paused / archived**. Pausing sets a date window — those days are excluded from
planning, so a pause never breaks your statistics.

## Responsive design

Built mobile-first and verified from 320px up to 2560px: bottom navigation and a quick-add
FAB on phones, icon rail on tablets, full sidebar on desktop, `max-width: 1600px` content
container, safe-area insets for iPhone, 44px minimum touch targets, no horizontal overflow.

## Accessibility

Semantic HTML, ARIA labels on all interactive controls, visible focus rings, keyboard
navigation (Enter/Escape in modals), contrast-checked text, `prefers-reduced-motion` support
plus an in-app "Reduce motion" switch.
