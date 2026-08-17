# Spelling Bee

A clone of the NYT Spelling Bee word game.

## Play

Open `index.html` in a browser, or deploy to GitHub Pages.

## How to Play

1. Make words using the7 letters shown
2. Every word must include the center letter (highlighted in yellow)
3. Words must be at least4 letters long
4. Letters can be used more than once
5. Find the pangram (uses all7 letters) for bonus points!

## Controls

- **Click** letters on the honeycomb to type
- **Keyboard**: Type letters, Backspace to delete, Enter to submit, Space to shuffle
- **Hints button**: See word counts by length and first letter
- **Settings**: Toggle dark mode, view game history

## Deploy to GitHub Pages

1. Push this folder to a GitHub repo
2. Go to Settings > Pages
3. Select "Deploy from a branch" and choose `main` / `/ (root)`
4. Your game will be at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

## Install as App

On Android:
1. Open the game in Chrome
2. Tap the menu (3 dots)
3. Select "Add to Home screen"

## Regenerating Puzzles

To generate new puzzles with a different random seed:

```bash
node generate-puzzles.mjs
```

Requires the word list at `/tmp/bee-words.txt` from [open-spelling-bee](https://github.com/Gyanreyer/open-spelling-bee).

## License

Word list from [open-spelling-bee](https://github.com/Gyanreyer/open-spelling-bee).