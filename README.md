# Spelling Bee

A web-based clone of the NYT Spelling Bee word puzzle game. Works offline as a Progressive Web App (PWA) — no server required.

## Play

**Play directly:** Open `index.html` in any browser, or visit the [live version](https://robin-thatch.github.io/spelling-bee/).

**Install as app:** On mobile, use your browser's "Add to Home Screen" option for a full-screen, offline-capable experience.

## How to Play

1. Make words using the **7 letters** shown in the honeycomb
2. Every word **must include the center letter** (highlighted in yellow)
3. Words must be **at least 4 letters** long
4. **Letters can be reused** multiple times
5. Find the **pangram** (uses all 7 letters) for bonus points!

### Scoring

| Word Length | Points |
|-------------|--------|
| 4 letters | 1 point |
| 5 letters | 5 points |
| 6 letters | 6 points |
| 7+ letters | 1 point per letter |
| Pangram bonus | +7 points |

### Ranks

| Rank | % of Max Points |
|------|-----------------|
| Beginner | 0% |
| Good Start | 2% |
| Moving Up | 5% |
| Good | 8% |
| Solid | 15% |
| Nice | 25% |
| Great | 40% |
| Amazing | 50% |
| Genius | 70% |
| Queen Bee | 100% |

## Controls

### Mouse/Touch
- **Click letters** on the honeycomb to type
- **Tap Delete** to remove the last letter
- **Tap Enter** to submit your word
- **Tap Shuffle** (or the ⇄ icon) to rearrange outer letters

### Keyboard
| Key | Action |
|-----|--------|
| `A`–`Z` | Type letters |
| `Backspace` | Delete last letter |
| `Enter` | Submit word |
| `Space` | Shuffle letters |

### UI Buttons
- **Hints** (ⓘ) — Shows a grid of word counts by first letter and length, two-letter pair counts, and progressive pangram hints
- **History** (🕐) — View past puzzles with scores and ranks
- **Theme** (☀/🌙) — Toggle dark/light mode
- **Reveal Solution** — Give up and see all answers

## Features

- **PWA with offline support** — Service worker caches all assets; works without internet after first visit
- **Puzzle generator** — Generates random puzzles on-the-fly from a curated word list of ~49,000 words (4–19 letters)
- **Persistent game state** — Progress saved in localStorage; resume where you left off
- **Dark/light theme** — Toggle or auto-detect from system preference
- **Game history** — Tracks your last 5 puzzles with scores and completion status
- **Progressive hints** — Reveal pangram hints one level at a time
- **Responsive design** — Works on mobile and desktop
- **No dependencies** — Pure HTML, CSS, and vanilla JavaScript

## Project Structure

```
spelling-bee/
├── index.html           # Single HTML page
├── style.css            # Styles (dark/light themes, honeycomb layout)
├── app.js               # Game logic, UI, state management
├── words.js             # Word list (~49K words, loaded as window.WORDS)
├── puzzle-generator.js  # Random puzzle generation from word list
├── sw.js                # Service worker for offline caching
├── manifest.json        # PWA manifest
└── icons/               # App icons (192px, 512px)
```

## Deploy

### GitHub Pages

1. Push this folder to a GitHub repo
2. Go to **Settings → Pages**
3. Select **Deploy from a branch** and choose `main` / `/ (root)`
4. Your game will be at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

### Any Static Host

No build step required. Upload the files as-is to Netlify, Vercel, Cloudflare Pages, or any static hosting.

### Local

Simply open `index.html` in a browser. No server needed.

## Install as App

### Android (Chrome)
1. Open the game in Chrome
2. Tap the menu (⋮)
3. Select **Add to Home screen**

### iOS (Safari)
1. Open the game in Safari
2. Tap the Share button (□↑)
3. Select **Add to Home Screen**

### Desktop (Chrome/Edge)
1. Open the game
2. Click the install icon (⊕) in the address bar

## Technical Notes

- **Word list source:** [open-spelling-bee](https://github.com/Gyanreyer/open-spelling-bee) — a curated list of common English words
- **No server dependency:** Words are loaded via a `<script>` tag (not `fetch`) so the app works on `file://` and offline
- **Storage:** Uses `localStorage` with keys `spelling-bee-state` (game progress) and `spelling-bee-theme` (dark/light preference)
- **Service worker:** Cache-first strategy; bump `CACHE_VERSION` in `sw.js` when deploying updates

## License

Word list from [open-spelling-bee](https://github.com/Gyanreyer/open-spelling-bee).
