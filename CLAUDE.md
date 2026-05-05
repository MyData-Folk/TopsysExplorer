# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

TopsysExplorer is a 100% client-side React SPA for analyzing Topsys v8.5 hotel occupancy PDF reports. No backend — all PDF parsing, data processing, and storage happens in the browser.

## Commands

```bash
npm run dev       # Dev server at http://localhost:3000 (binds 0.0.0.0)
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
npm run lint      # TypeScript type checking (tsc --noEmit, no test runner configured)
npm run clean     # Remove dist/
npm run deploy    # Deploy to GitHub Pages
```

## Architecture

**Data flow:**
```
User PDF upload → pdfParser.ts → useAppStore → localStorage (config) + IndexedDB (reports) → React UI
```

**State management** (`src/store/useAppStore.ts`): Custom hook pattern (no external state library). Config persists to `localStorage` under key `hotel_analyzer_config`. Reports persist to IndexedDB under key `hotel_analyzer_reports_v2`.

**PDF parsing** (`src/lib/pdfParser.ts`): Core logic for extracting occupancy data from Topsys v8.5 format PDFs. Key functions: `parseTopsysPdf()`, `autoDetectCategories()`, `detectEstablishmentName()`.

**Tab-based UI** (`src/App.tsx`): Five tabs — Import, Analyse, Evolution, Settings, Help. Tab routing is managed in App.tsx with no router library.

**Multi-hotel support**: Each hotel profile has its own room type configuration. Reports are auto-associated with hotels via name detection in `detectEstablishmentName()`.

## Key Files

| File | Purpose |
|------|---------|
| `src/types.ts` | All TypeScript interfaces (`OccupancyData`, `HotelConfig`, `AppConfig`, `FilterState`) |
| `src/lib/pdfParser.ts` | PDF parsing — most complex module |
| `src/store/useAppStore.ts` | Global state + persistence |
| `src/App.tsx` | Root component, tab routing, modal management |
| `src/utils/constants.ts` | Default configs, French locale data |
| `src/utils/archive.ts` | File System Access API for local drive archiving |
| `src/hooks/useFilteredData.ts` | Filters reports by room type, dates, occupancy |

## Tech Stack

- React 19 + TypeScript 5.8, Vite 6
- Tailwind CSS 4 (via `@tailwindcss/vite`), Framer Motion 12
- Recharts 3 (charts), pdfjs-dist 5 (PDF parsing), SheetJS/xlsx (Excel export)
- idb-keyval 6 (IndexedDB), lucide-react (icons)

## Theme & Config

Dark/light theme stored in `AppConfig.theme`, applied via `data-theme` attribute on `<html>`. Thresholds `highOccupancyThreshold` (default 85%) and `lowOccupancyThreshold` (default 30%) drive color coding across the UI.

## Notes

- The `.env.example` file exists but its variables (`GEMINI_API_KEY`, `APP_URL`) are not used in the codebase.
- No test runner is configured — `npm run lint` only runs TypeScript type checking.
- The app is documented in French (README.md is in French).
