/**
 * Spelling Bee - PWA Game
 * A clone of the NYT Spelling Bee word game
 */

// ===== Constants =====
const STORAGE_KEY = 'spelling-bee-state';
const THEME_KEY = 'spelling-bee-theme';
const MAX_HISTORY = 5;

// ===== State =====
let state = {
  currentPuzzleId: 0,
  foundWords: [],
  score: 0,
  history: [], // Array of { puzzleId, letters, centerLetter, foundWords, score, maxPoints, rank, completed, revealedAt }
  puzzleSeed: Date.now(),
};

let puzzles = [];
let currentPuzzle = null;
let inputValue = '';
let messageTimeout = null;

// ===== DOM Elements =====
const els = {};

function cacheDom() {
  els.app = document.getElementById('app');
  els.hive = document.getElementById('hive');
  els.inputArea = document.getElementById('input-area');
  els.inputText = document.getElementById('input-text');
  els.cursor = document.getElementById('cursor');
  els.message = document.getElementById('message');
  els.foundWords = document.getElementById('found-words');
  els.foundToggle = document.getElementById('btn-found-toggle');
  els.scoreBar = document.getElementById('score-bar');
  els.scoreMarkers = document.getElementById('score-markers');
  els.scoreValue = document.getElementById('score-value');
  els.currentRank = document.getElementById('current-rank');
  els.hintsOverlay = document.getElementById('hints-overlay');
  els.hintsContent = document.getElementById('hints-content');
  els.settingsOverlay = document.getElementById('settings-overlay');
  els.historyOverlay = document.getElementById('history-overlay');
  els.historyList = document.getElementById('history-list');
  els.solutionOverlay = document.getElementById('solution-overlay');
  els.solutionContent = document.getElementById('solution-content');
  els.completeOverlay = document.getElementById('complete-overlay');
  els.completeMessage = document.getElementById('complete-message');
  els.toggleDark = document.getElementById('toggle-dark');
}

// ===== Initialization =====
async function init() {
  cacheDom();
  loadTheme();
  await loadPuzzles();
  loadState();
  setupEventListeners();
  startPuzzle();
}

async function loadPuzzles() {
  try {
    const response = await fetch('puzzles.json');
    const data = await response.json();
    puzzles = data.puzzles;
    console.log(`Loaded ${puzzles.length} puzzles`);
  } catch (err) {
    console.error('Failed to load puzzles:', err);
    showMessage('Failed to load puzzles', 'error');
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
    }
  } catch (err) {
    console.error('Failed to load state:', err);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

function loadTheme() {
  const theme = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  if (els.toggleDark) {
    els.toggleDark.setAttribute('aria-checked', theme === 'dark');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  els.toggleDark.setAttribute('aria-checked', next === 'dark');
}

// ===== Puzzle Management =====
function getNextPuzzleId() {
  // Simple incrementing, wrap around
  return state.currentPuzzleId % puzzles.length;
}

function startPuzzle() {
  const id = getNextPuzzleId();
  currentPuzzle = puzzles[id];
  
  if (!currentPuzzle) {
    showMessage('No puzzles available', 'error');
    return;
  }
  
  // Check if we have saved progress for this puzzle
  const existingHistory = state.history.find(h => h.puzzleId === id);
  if (existingHistory && !existingHistory.completed) {
    // Resume
    state.foundWords = existingHistory.foundWords || [];
    state.score = existingHistory.score || 0;
  } else if (existingHistory && existingHistory.completed) {
    // This puzzle is done, get next
    state.currentPuzzleId++;
    saveState();
    startPuzzle();
    return;
  } else {
    // New puzzle
    state.foundWords = [];
    state.score = 0;
  }
  
  renderHive();
  renderScoreMarkers();
  updateScore();
  updateFoundWords();
  inputValue = '';
  updateInput();
  saveState();
}

function shuffleLetters() {
  if (!currentPuzzle) return;
  
  const outer = currentPuzzle.letters.filter(l => l !== currentPuzzle.centerLetter);
  for (let i = outer.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [outer[i], outer[j]] = [outer[j], outer[i]];
  }
  
  const letters = [outer[0], outer[1], outer[2], currentPuzzle.centerLetter, outer[3], outer[4], outer[5]];
  renderHiveWithLetters(letters, currentPuzzle.centerLetter);
}

function renderHive() {
  if (!currentPuzzle) return;
  
  // Get the7 letters, placing center at index3
  const outer = currentPuzzle.letters.filter(l => l !== currentPuzzle.centerLetter);
  const letters = [outer[0], outer[1], outer[2], currentPuzzle.centerLetter, outer[3], outer[4], outer[5]];
  
  renderHiveWithLetters(letters, currentPuzzle.centerLetter);
}

function renderHiveWithLetters(letters, centerLetter) {
  // letters array: [outer0, outer1, outer2, center, outer3, outer4, outer5]
  // Position mapping: 0=top-right, 1=top, 2=top-left, 3=bottom-left, 4=bottom, 5=bottom-right
  const center = letters[3];
  
  document.getElementById('letter-center').textContent = center.toUpperCase();
  document.getElementById('letter-0').textContent = letters[0].toUpperCase();
  document.getElementById('letter-1').textContent = letters[1].toUpperCase();
  document.getElementById('letter-2').textContent = letters[2].toUpperCase();
  document.getElementById('letter-3').textContent = letters[4].toUpperCase();
  document.getElementById('letter-4').textContent = letters[5].toUpperCase();
  document.getElementById('letter-5').textContent = letters[6].toUpperCase();
  
  alignInputArea();
}

function alignInputArea() {
  const hiveRect = els.hive.getBoundingClientRect();
  const centerLetter = document.getElementById('letter-center');
  const letterRect = centerLetter.getBoundingClientRect();
  const centerOffset = letterRect.left + letterRect.width / 2 - hiveRect.left;
  els.inputArea.style.left = centerOffset + 'px';
}

// ===== Input Handling =====
function addLetter(letter) {
  inputValue += letter.toLowerCase();
  updateInput();
}

function deleteLetter() {
  inputValue = inputValue.slice(0, -1);
  updateInput();
}

function submitWord() {
  const word = inputValue.toLowerCase().trim();
  
  if (word.length < 4) {
    showMessage('Too short', 'error');
    shakeInput();
    return;
  }
  
  if (!word.includes(currentPuzzle.centerLetter)) {
    showMessage('Missing center letter', 'error');
    shakeInput();
    return;
  }
  
  // Check if word uses only available letters
  const availableLetters = new Set(currentPuzzle.letters);
  if (!word.split('').every(l => availableLetters.has(l))) {
    showMessage('Bad letters', 'error');
    shakeInput();
    return;
  }
  
  if (state.foundWords.includes(word)) {
    showMessage('Already found', 'info');
    inputValue = '';
    updateInput();
    return;
  }
  
  if (currentPuzzle.answers.includes(word)) {
    // Valid word!
    state.foundWords.push(word);
    
    const isPangram = currentPuzzle.pangrams.includes(word);
    const points = calculateWordPoints(word, isPangram);
    state.score += points;
    
    // Update history
    updateHistory();
    
    if (isPangram) {
      showMessage('Pangram! +' + points, 'success');
    } else {
      showMessage('+' + points, 'success');
    }
    
    // Check if puzzle is complete
    if (state.foundWords.length === currentPuzzle.answers.length) {
      setTimeout(() => showComplete(), 500);
    }
    
    updateScore();
    updateFoundWords();
    saveState();
  } else {
    showMessage('Not in word list', 'error');
    shakeInput();
  }
  
  inputValue = '';
  updateInput();
}

function calculateWordPoints(word, isPangram) {
  if (word.length === 4) return 1;
  let points = word.length;
  if (isPangram) points += 7;
  return points;
}

function updateHistory() {
  const existing = state.history.find(h => h.puzzleId === state.currentPuzzleId);
  if (existing) {
    existing.foundWords = [...state.foundWords];
    existing.score = state.score;
  } else {
    state.history.push({
      puzzleId: state.currentPuzzleId,
      letters: currentPuzzle.letters,
      centerLetter: currentPuzzle.centerLetter,
      foundWords: [...state.foundWords],
      score: state.score,
      maxPoints: currentPuzzle.maxPoints,
      rank: getCurrentRank(),
      completed: false,
      playedAt: Date.now(),
    });
  }
  
  // Keep only last MAX_HISTORY
  if (state.history.length > MAX_HISTORY) {
    state.history = state.history.slice(-MAX_HISTORY);
  }
}

function getCurrentRank() {
  if (!currentPuzzle) return 'Beginner';
  const percentage = (state.score / currentPuzzle.maxPoints) * 100;
  
  for (let i = currentPuzzle.rankings.length - 1; i >= 0; i--) {
    const rank = currentPuzzle.rankings[i];
    const threshold = (rank.points / currentPuzzle.maxPoints) * 100;
    if (percentage >= threshold) {
      return rank.name;
    }
  }
  return 'Beginner';
}

// ===== UI Updates =====
function updateInput() {
  els.inputText.textContent = inputValue.toUpperCase();
  els.cursor.style.display = inputValue.length > 0 ? 'none' : 'inline';
}

function updateScore() {
  if (!currentPuzzle) return;
  
  const percentage = Math.min((state.score / currentPuzzle.maxPoints) * 100, 100);
  els.scoreBar.style.width = percentage + '%';
  els.scoreValue.textContent = state.score;
  els.currentRank.textContent = getCurrentRank();
  
  // Update marker states
  const markers = els.scoreMarkers.querySelectorAll('.score-marker');
  markers.forEach(marker => {
    const threshold = parseFloat(marker.dataset.threshold);
    marker.classList.toggle('reached', percentage >= threshold);
  });
}

function renderScoreMarkers() {
  if (!currentPuzzle || !currentPuzzle.rankings) return;
  
  els.scoreMarkers.innerHTML = '';
  currentPuzzle.rankings.forEach(rank => {
    if (rank.points === 0) return; // Skip Beginner (0%)
    const pct = (rank.points / currentPuzzle.maxPoints) * 100;
    const dot = document.createElement('div');
    dot.className = 'score-marker';
    dot.style.left = pct + '%';
    dot.dataset.threshold = pct;
    dot.title = rank.name;
    els.scoreMarkers.appendChild(dot);
  });
}

function updateFoundWords() {
  const container = els.foundWords;
  container.innerHTML = '';
  
  // Sort found words: pangrams first, then by length, then alphabetically
  const sorted = [...state.foundWords].sort((a, b) => {
    const aPangram = currentPuzzle.pangrams.includes(a);
    const bPangram = currentPuzzle.pangrams.includes(b);
    if (aPangram !== bPangram) return bPangram - aPangram;
    return a.length - b.length || a.localeCompare(b);
  });
  
  sorted.forEach(word => {
    const div = document.createElement('div');
    div.className = 'word';
    if (currentPuzzle.pangrams.includes(word)) {
      div.classList.add('pangram');
    }
    div.textContent = word;
    container.appendChild(div);
  });
}

function showMessage(text, type = 'info') {
  els.message.textContent = text;
  els.message.className = type;
  
  clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    els.message.className = 'hidden';
  }, 2000);
}

function shakeInput() {
  els.hive.classList.add('shake');
  setTimeout(() => els.hive.classList.remove('shake'), 400);
}

// ===== Hints =====
function showHints() {
  if (!currentPuzzle) return;
  
  const letters = currentPuzzle.letters.sort();
  const center = currentPuzzle.centerLetter;
  
  // Build the hints table
  // Rows: the 7 letters
  // Columns: word lengths (4,5,6,7,8,9,10+)
  const lengths = [4, 5, 6, 7, 8, 9, 10];
  const lengthLabels = ['4', '5', '6', '7', '8', '9', '10+'];
  
  // Count answers by length and first letter
  const counts = {};
  const foundCounts = {};
  
  currentPuzzle.answers.forEach(word => {
    const len = Math.min(word.length, 10);
    const first = word[0];
    const key = `${len}-${first}`;
    counts[key] = (counts[key] || 0) + 1;
    
    if (state.foundWords.includes(word)) {
      foundCounts[key] = (foundCounts[key] || 0) + 1;
    }
  });
  
  // Build table HTML
  // Columns: lengths, Rows: letters
  let html = '<table class="hints-table"><thead><tr><th></th>';
  lengthLabels.forEach(l => {
    html += `<th>${l}</th>`;
  });
  html += '<th>Total</th></tr></thead><tbody>';
  
  letters.forEach(letter => {
    html += `<tr><td class="row-header">${letter.toUpperCase()}</td>`;
    
    let rowTotal = 0;
    let rowFound = 0;
    
    lengths.forEach(len => {
      const key = `${len}-${letter}`;
      const total = counts[key] || 0;
      const found = foundCounts[key] || 0;
      rowTotal += total;
      rowFound += found;
      
      if (total === 0) {
        html += '<td class="empty">•</td>';
      } else if (found === total) {
        html += `<td class="solved">${total} ✓</td>`;
      } else {
        html += `<td class="partial">(${found}/${total})</td>`;
      }
    });
    
    // Row total
    if (rowTotal === 0) {
      html += '<td class="total-cell">•</td>';
    } else if (rowFound === rowTotal) {
      html += `<td class="solved-total">${rowTotal} ✓</td>`;
    } else {
      html += `<td class="total-cell">(${rowFound}/${rowTotal})</td>`;
    }
    
    html += '</tr>';
  });
  
  // Column totals row
  html += '<tr><td class="row-header">Total</td>';
  let grandTotal = 0;
  let grandFound = 0;
  
  lengths.forEach(len => {
    let colTotal = 0;
    let colFound = 0;
    letters.forEach(letter => {
      const key = `${len}-${letter}`;
      colTotal += counts[key] || 0;
      colFound += foundCounts[key] || 0;
    });
    grandTotal += colTotal;
    grandFound += colFound;
    
    if (colTotal === 0) {
      html += '<td class="total-cell">•</td>';
    } else if (colFound === colTotal) {
      html += `<td class="solved-total">${colTotal} ✓</td>`;
    } else {
      html += `<td class="total-cell">(${colFound}/${colTotal})</td>`;
    }
  });
  
  // Grand total
  if (grandTotal === 0) {
    html += '<td class="total-cell">•</td>';
  } else if (grandFound === grandTotal) {
    html += `<td class="solved-total">${grandTotal} ✓</td>`;
  } else {
    html += `<td class="total-cell">(${grandFound}/${grandTotal})</td>`;
  }
  
  html += '</tr></tbody></table>';
  
  // Two-letter pairs section
  html += '<div class="two-letter-section"><h3>Two-Letter Counts</h3><div class="two-letter-grid">';
  
  const twoLetterCounts = {};
  currentPuzzle.answers.forEach(word => {
    if (word.length >= 2) {
      const pair = word.slice(0, 2).toUpperCase();
      twoLetterCounts[pair] = (twoLetterCounts[pair] || 0) + 1;
    }
  });
  
  const sortedPairs = Object.entries(twoLetterCounts).sort((a, b) => a[0].localeCompare(b[0]));
  sortedPairs.forEach(([pair, count]) => {
    html += `<div class="two-letter-item">${pair}: ${count}</div>`;
  });
  
  html += '</div></div>';
  
  els.hintsContent.innerHTML = html;
  showOverlay(els.hintsOverlay);
}

// ===== History =====
function showHistory() {
  const container = els.historyList;
  container.innerHTML = '';
  
  if (state.history.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);">No games played yet</p>';
    showOverlay(els.historyOverlay);
    return;
  }
  
  // Show most recent first
  const reversed = [...state.history].reverse();
  reversed.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'history-item';
    
    const lettersHtml = entry.letters.map(l => {
      if (l === entry.centerLetter) {
        return `<span class="center-letter">${l.toUpperCase()}</span>`;
      }
      return l.toUpperCase();
    }).join('');
    
    div.innerHTML = `
      <div class="history-item-info">
        <div class="history-item-letters">${lettersHtml}</div>
        <div class="history-item-stats">${entry.foundWords.length} words • ${entry.score} pts</div>
      </div>
      <div class="history-item-rank">${entry.rank}</div>
    `;
    
    div.addEventListener('click', () => showSolution(entry));
    container.appendChild(div);
  });
  
  showOverlay(els.historyOverlay);
}

// ===== Solution =====
function showSolution(entry) {
  const puzzle = puzzles[entry.puzzleId];
  if (!puzzle) return;
  
  let html = `
    <div class="solution-stats">
      <div class="solution-stat">
        <div class="solution-stat-value">${entry.foundWords.length}/${puzzle.answers.length}</div>
        <div class="solution-stat-label">Words</div>
      </div>
      <div class="solution-stat">
        <div class="solution-stat-value">${entry.score}</div>
        <div class="solution-stat-label">Points</div>
      </div>
      <div class="solution-stat">
        <div class="solution-stat-value">${entry.rank}</div>
        <div class="solution-stat-label">Rank</div>
      </div>
    </div>
  `;
  
  // Group by length
  const byLength = {};
  puzzle.answers.forEach(word => {
    const len = word.length;
    if (!byLength[len]) byLength[len] = [];
    byLength[len].push(word);
  });
  
  Object.keys(byLength).sort((a, b) => a - b).forEach(len => {
    html += `<div class="solution-section"><h3>${len} letters</h3><div class="solution-word-list">`;
    byLength[len].forEach(word => {
      const classes = ['solution-word'];
      if (entry.foundWords.includes(word)) classes.push('found');
      if (puzzle.pangrams.includes(word)) classes.push('pangram');
      html += `<span class="${classes.join(' ')}">${word}</span>`;
    });
    html += '</div></div>';
  });
  
  els.solutionContent.innerHTML = html;
  
  // Update the puzzle if viewing history of current puzzle
  if (entry.puzzleId === state.currentPuzzleId) {
    document.getElementById('btn-next-puzzle').textContent = 'Close';
    document.getElementById('btn-next-puzzle').onclick = () => hideOverlay(els.solutionOverlay);
  } else {
    document.getElementById('btn-next-puzzle').textContent = 'Play This Puzzle';
    document.getElementById('btn-next-puzzle').onclick = () => {
      state.currentPuzzleId = entry.puzzleId;
      saveState();
      hideOverlay(els.solutionOverlay);
      startPuzzle();
    };
  }
  
  hideOverlay(els.historyOverlay);
  showOverlay(els.solutionOverlay);
}

// ===== Game Complete =====
function showComplete() {
  const rank = getCurrentRank();
  const totalWords = currentPuzzle.answers.length;
  const totalPoints = state.score;
  
  els.completeMessage.innerHTML = `
    <h3>${rank}!</h3>
    <p>You found all ${totalWords} words for ${totalPoints} points!</p>
  `;
  
  // Mark as completed in history
  const existing = state.history.find(h => h.puzzleId === state.currentPuzzleId);
  if (existing) {
    existing.completed = true;
    existing.completedAt = Date.now();
  }
  
  saveState();
  showOverlay(els.completeOverlay);
}

function revealMissedWords() {
  const entry = {
    puzzleId: state.currentPuzzleId,
    letters: currentPuzzle.letters,
    centerLetter: currentPuzzle.centerLetter,
    foundWords: state.foundWords,
    score: state.score,
    rank: getCurrentRank(),
  };
  
  hideOverlay(els.completeOverlay);
  showSolution(entry);
}

function nextPuzzle() {
  state.currentPuzzleId++;
  saveState();
  hideOverlay(els.solutionOverlay);
  hideOverlay(els.completeOverlay);
  startPuzzle();
}

// ===== Overlay Management =====
function showOverlay(overlay) {
  overlay.classList.remove('hidden');
}

function hideOverlay(overlay) {
  overlay.classList.add('hidden');
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Hive cell clicks
  document.querySelectorAll('.hex-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      const id = cell.id;
      if (id === 'cell-center') {
        addLetter(currentPuzzle.centerLetter);
      } else {
        const idx = parseInt(id.split('-')[1]);
        const letter = document.getElementById(`letter-${idx}`).textContent.toLowerCase();
        addLetter(letter);
      }
    });
  });
  
  // Keyboard input
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      submitWord();
    } else if (e.key === 'Backspace') {
      deleteLetter();
    } else if (e.key === ' ') {
      shuffleLetters();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      addLetter(e.key);
    }
  });
  
  // Buttons
  document.getElementById('btn-delete').addEventListener('click', deleteLetter);
  document.getElementById('btn-enter').addEventListener('click', submitWord);
  document.getElementById('btn-shuffle').addEventListener('click', shuffleLetters);
  
  // Found words toggle
  els.foundToggle.addEventListener('click', () => {
    els.foundWords.classList.toggle('expanded');
    els.foundToggle.classList.toggle('expanded');
  });
  
  // Hints
  document.getElementById('btn-hints').addEventListener('click', showHints);
  document.getElementById('btn-hints-close').addEventListener('click', () => hideOverlay(els.hintsOverlay));
  
  // Settings
  document.getElementById('btn-settings').addEventListener('click', () => showOverlay(els.settingsOverlay));
  document.getElementById('btn-settings-close').addEventListener('click', () => hideOverlay(els.settingsOverlay));
  
  // Dark mode toggle
  els.toggleDark.addEventListener('click', toggleTheme);
  
  // History
  document.getElementById('btn-history').addEventListener('click', showHistory);
  document.getElementById('btn-history-close').addEventListener('click', () => hideOverlay(els.historyOverlay));
  
  // Solution
  document.getElementById('btn-solution-close').addEventListener('click', () => hideOverlay(els.solutionOverlay));
  
  // Complete
  document.getElementById('btn-reveal-missed').addEventListener('click', revealMissedWords);
  document.getElementById('btn-next-after-complete').addEventListener('click', nextPuzzle);
  
  // Close overlays on backdrop click
  document.querySelectorAll('.overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        hideOverlay(overlay);
      }
    });
  });
  
  // Re-align input on resize
  window.addEventListener('resize', alignInputArea);
}

// ===== Service Worker Registration =====
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  }
}

// ===== Start =====
document.addEventListener('DOMContentLoaded', () => {
  init();
  registerServiceWorker();
});