/**
 * Spelling Bee - Web Game
 * A clone of the NYT Spelling Bee word game
 */

// ===== Constants =====
const STORAGE_KEY = 'spelling-bee-state';
const THEME_KEY = 'spelling-bee-theme';
const FONT_SIZE_KEY = 'spelling-bee-font-size';
const MAX_HISTORY = 5;

// ===== State =====
let state = {
  currentPuzzleId: 0,
  foundWords: [],
  score: 0,
  currentPuzzle: null, // Saved puzzle data for persistence
  pangramHintLevel: 0, // 0-6, then extra chars revealed after level 6
  extraCharsRevealed: 0, // Additional characters revealed after level 6
  history: [], // Array of { puzzleId, letters, centerLetter, foundWords, score, maxPoints, rank, completed, revealedAt }
};

let generator = null;
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
  els.historyOverlay = document.getElementById('history-overlay');
  els.historyList = document.getElementById('history-list');
  els.solutionOverlay = document.getElementById('solution-overlay');
  els.solutionContent = document.getElementById('solution-content');
  els.completeOverlay = document.getElementById('complete-overlay');
  els.completeMessage = document.getElementById('complete-message');
  els.btnTheme = document.getElementById('btn-theme');
  els.btnHistory = document.getElementById('btn-history');
  els.btnGiveUp = document.getElementById('btn-give-up');
}

// ===== Initialization =====
function highlightCenterLetterWithCenter(text, centerLetter) {
  const center = centerLetter.toUpperCase();
  return text.split('').map(ch => {
    if (ch.toUpperCase() === center) {
      return `<span class="center-letter-highlight">${ch}</span>`;
    }
    return ch;
  }).join('');
}

function loadFontSize() {
  const saved = localStorage.getItem(FONT_SIZE_KEY);
  if (saved) {
    document.documentElement.style.setProperty('--found-words-font-size', saved);
    // Set active button
    const numeric = parseInt(saved);
    document.querySelectorAll('.font-size-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.size) === numeric);
    });
  } else {
    // Default to medium (17px)
    document.querySelector('.font-size-btn[data-size="17"]').classList.add('active');
  }
}

function setFontSize(size) {
  const value = size + 'px';
  document.documentElement.style.setProperty('--found-words-font-size', value);
  localStorage.setItem(FONT_SIZE_KEY, value);
  // Update active state on buttons
  document.querySelectorAll('.font-size-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.size) === size);
  });
}

function init() {
  cacheDom();
  loadTheme();
  loadFontSize();
  loadPuzzles();
  loadState();
  setupEventListeners();
  startPuzzle();
}

function loadPuzzles() {
  try {
    generator = new PuzzleGenerator();
    console.log('Puzzle generator ready');
    return true;
  } catch (err) {
    console.error('Failed to initialize generator:', err);
    showMessage('Failed to initialize puzzle generator', 'error');
    return false;
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
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
}

// ===== Puzzle Management =====
function startPuzzle() {
  if (!generator || !generator.loaded) {
    showMessage('Puzzle generator not ready', 'error');
    return;
  }
  
  // Check if we have a saved puzzle to restore
  if (state.currentPuzzle) {
    currentPuzzle = state.currentPuzzle;
  } else {
    // Generate a new puzzle
    currentPuzzle = generator.generate();
    
    if (!currentPuzzle) {
      showMessage('Could not generate puzzle', 'error');
      return;
    }
    
    // Save the puzzle to state for persistence
    state.currentPuzzle = currentPuzzle;
    state.currentPuzzleId++;
    state.foundWords = [];
    state.score = 0;
    
    // Store puzzle in history for reference
    updateHistory();
    saveState();
  }
  
  renderHive();
  renderScoreMarkers();
  updateScore();
  updateFoundWords();
  inputValue = '';
  updateInput();
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
  // No-op: input is now in normal flow, centered by CSS
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
    setTimeout(() => { inputValue = ''; updateInput(); }, 500);
    return;
  }
  
  if (!word.includes(currentPuzzle.centerLetter)) {
    showMessage('Missing center letter', 'error');
    shakeInput();
    setTimeout(() => { inputValue = ''; updateInput(); }, 500);
    return;
  }
  
  // Check if word uses only available letters
  const availableLetters = new Set(currentPuzzle.letters);
  if (!word.split('').every(l => availableLetters.has(l))) {
    showMessage('Bad letters', 'error');
    shakeInput();
    setTimeout(() => { inputValue = ''; updateInput(); }, 500);
    return;
  }
  
  if (state.foundWords.includes(word)) {
    showMessage('Already found', 'info');
    shakeInput();
    setTimeout(() => { inputValue = ''; updateInput(); }, 500);
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
    inputValue = '';
    updateInput();
  } else {
    showMessage('Not in word list', 'error');
    shakeInput();
    setTimeout(() => { inputValue = ''; updateInput(); }, 500);
  }
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
    existing.rank = getCurrentRank();
  } else {
    state.history.push({
      puzzleId: state.currentPuzzleId,
      letters: currentPuzzle.letters,
      centerLetter: currentPuzzle.centerLetter,
      answers: currentPuzzle.answers,
      pangrams: currentPuzzle.pangrams,
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
function highlightCenterLetter(text) {
  if (!currentPuzzle) return text;
  const center = currentPuzzle.centerLetter.toUpperCase();
  return text.split('').map(ch => {
    if (ch.toUpperCase() === center) {
      return `<span class="center-letter-highlight">${ch}</span>`;
    }
    return ch;
  }).join('');
}

function updateInput() {
  els.inputText.innerHTML = highlightCenterLetter(inputValue.toUpperCase());
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
  
  if (state.foundWords.length === 0) return;
  
  // Show newest first
  const recent = [...state.foundWords].reverse();
  
  recent.forEach((word, i) => {
    const span = document.createElement('span');
    span.className = 'word';
    if (currentPuzzle.pangrams.includes(word)) {
      span.classList.add('pangram');
    }
    span.innerHTML = highlightCenterLetter(word.toUpperCase());
    container.appendChild(span);
    
    // Add separator (hidden when expanded)
    if (i < recent.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'word-sep';
      sep.textContent = '\u00b7';
      container.appendChild(sep);
    }
  });
}

function showMessage(text, type = 'info') {
  els.message.textContent = text;
  els.message.className = type + ' visible';
  
  clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    els.message.className = '';
  }, 2000);
}

function shakeInput() {
  els.inputArea.classList.add('shake');
  setTimeout(() => {
    els.inputArea.classList.remove('shake');
  }, 400);
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
  
  // Letters bar at top
  let html = '<div class="solution-letters-bar">';
  currentPuzzle.letters.forEach(l => {
    const isCenter = l === center;
    html += `<span class="solution-letter${isCenter ? ' center' : ''}">${l.toUpperCase()}</span>`;
  });
  html += '</div>';

  // Build table HTML
  // Columns: lengths, Rows: letters
  html += '<table class="hints-table"><thead><tr><th></th>';
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
  const twoLetterFound = {};
  currentPuzzle.answers.forEach(word => {
    if (word.length >= 2) {
      const pair = word.slice(0, 2).toUpperCase();
      twoLetterCounts[pair] = (twoLetterCounts[pair] || 0) + 1;
      if (state.foundWords.includes(word)) {
        twoLetterFound[pair] = (twoLetterFound[pair] || 0) + 1;
      }
    }
  });
  
  const sortedPairs = Object.entries(twoLetterCounts).sort((a, b) => a[0].localeCompare(b[0]));
  sortedPairs.forEach(([pair, count]) => {
    const found = twoLetterFound[pair] || 0;
    const display = found > 0 ? `${found}/${count}` : `${count}`;
    const className = found === count ? 'two-letter-item solved' : (found > 0 ? 'two-letter-item partial' : 'two-letter-item');
    html += `<div class="${className}">${pair}: ${display}</div>`;
  });
  
  html += '</div></div>';
  
  // Pangram hints section
  html += '<div class="pangram-hints-section"><h3>Pangram Hints</h3>';
  html += '<div class="pangram-hints-content">';
  html += generatePangramHints();
  html += '</div>';
  
  // Show button if we haven't revealed all characters yet
  const maxRevealNeeded = getMaxRevealNeeded();
  const showButton = state.pangramHintLevel < 6 || (state.pangramHintLevel >= 6 && state.extraCharsRevealed < maxRevealNeeded);
  
  if (showButton) {
    html += '<button id="btn-pangram-hint" class="text-btn pangram-hint-btn">Reveal next hint</button>';
  }
  html += '</div>';
  
  els.hintsContent.innerHTML = html;
  
  // Add event listener for pangram hint button
  const hintBtn = document.getElementById('btn-pangram-hint');
  if (hintBtn) {
    hintBtn.addEventListener('click', () => {
      if (state.pangramHintLevel < 6) {
        state.pangramHintLevel++;
      } else {
        state.extraCharsRevealed++;
      }
      saveState(); // Persist hint level
      showHints(); // Re-render hints with new level
    });
  }
  
  showOverlay(els.hintsOverlay);
}

function getMaxRevealNeeded() {
  if (!currentPuzzle) return 0;
  // Return the maximum number of extra chars needed across all pangrams
  return Math.max(...currentPuzzle.pangrams.map(p => p.length - 3)); // -3 for the prefix already shown
}

function generatePangramHints() {
  if (!currentPuzzle) return '';
  
  const pangrams = currentPuzzle.pangrams;
  const foundPangrams = pangrams.filter(w => state.foundWords.includes(w));
  
  let html = '';
  
  // Level 1: How many pangrams
  if (state.pangramHintLevel >= 1) {
    const total = pangrams.length;
    const found = foundPangrams.length;
    html += `<div class="pangram-hint-level"><span class="hint-label">Pangrams:</span> ${found}/${total} found</div>`;
  }
  
  // Level 2: First letter of each
  if (state.pangramHintLevel >= 2) {
    html += '<div class="pangram-hint-level"><span class="hint-label">Starts with:</span> ';
    html += pangrams.map(p => {
      const isFound = state.foundWords.includes(p);
      return `<span class="hint-letter ${isFound ? 'found' : ''}">${p[0].toUpperCase()}</span>`;
    }).join(', ');
    html += '</div>';
  }
  
  // Level 3: Length of each
  if (state.pangramHintLevel >= 3) {
    html += '<div class="pangram-hint-level"><span class="hint-label">Length:</span> ';
    html += pangrams.map(p => {
      const isFound = state.foundWords.includes(p);
      return `<span class="hint-length ${isFound ? 'found' : ''}">${p.length} letters</span>`;
    }).join(', ');
    html += '</div>';
  }
  
  // Level 4: Two-letter combination
  if (state.pangramHintLevel >= 4) {
    html += '<div class="pangram-hint-level"><span class="hint-label">First 2 letters:</span> ';
    html += pangrams.map(p => {
      const isFound = state.foundWords.includes(p);
      return `<span class="hint-prefix ${isFound ? 'found' : ''}">${p.slice(0, 2).toUpperCase()}</span>`;
    }).join(', ');
    html += '</div>';
  }
  
  // Level 5: Three starting letters
  if (state.pangramHintLevel >= 5) {
    html += '<div class="pangram-hint-level"><span class="hint-label">First 3 letters:</span> ';
    html += pangrams.map(p => {
      const isFound = state.foundWords.includes(p);
      return `<span class="hint-prefix ${isFound ? 'found' : ''}">${p.slice(0, 3).toUpperCase()}</span>`;
    }).join(', ');
    html += '</div>';
  }
  
  // Level 6+: Partial reveal with progressive disclosure
  if (state.pangramHintLevel >= 6) {
    html += '<div class="pangram-hint-level"><span class="hint-label">Partial:</span> ';
    html += pangrams.map(p => {
      const isFound = state.foundWords.includes(p);
      if (isFound) {
        return `<span class="hint-word found">${p.toUpperCase()}</span>`;
      }
      
      // First 3 letters are always shown
      // After level 6, each click reveals one more random character
      const knownPrefix = 3;
      const totalExtraNeeded = p.length - knownPrefix;
      const extraToReveal = Math.min(state.extraCharsRevealed, totalExtraNeeded);
      
      // Get remaining indices (after prefix) and shuffle for consistent random reveal
      const remainingIndices = Array.from({length: p.length - knownPrefix}, (_, i) => i + knownPrefix);
      // Use a seeded shuffle based on word to keep consistency between renders
      const seed = p.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const shuffled = remainingIndices.sort((a, b) => ((a * 2654435761) ^ seed) - ((b * 2654435761) ^ seed));
      
      const revealIndices = new Set([0, 1, 2, ...shuffled.slice(0, extraToReveal)]);
      
      const partial = p.split('').map((c, i) => 
        revealIndices.has(i) ? c.toUpperCase() : '_'
      ).join('');
      
      return `<span class="hint-word partial">${partial}</span>`;
    }).join(', ');
    html += '</div>';
  }
  
  return html;
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
    
    const statusText = entry.revealedAt ? 'Revealed' : (entry.completed ? 'Completed' : 'In Progress');
    
    div.innerHTML = `
      <div class="history-item-info">
        <div class="history-item-letters">${lettersHtml}</div>
        <div class="history-item-stats">${entry.foundWords.length} words • ${entry.score} pts</div>
        <div class="history-item-status ${entry.revealedAt ? 'revealed' : (entry.completed ? 'completed' : 'in-progress')}">${statusText}</div>
      </div>
      <div class="history-item-rank">${entry.rank}</div>
    `;
    
    div.addEventListener('click', () => showSolution(entry));
    container.appendChild(div);
  });
  
  showOverlay(els.historyOverlay);
}

// ===== Solution =====
function showSolution(entry, isGiveUp = false) {
  // Use puzzle data from entry (stored in history)
  const puzzle = {
    answers: entry.answers || [],
    pangrams: entry.pangrams || []
  };
  
  // Letters bar at top
  const centerLetter = entry.centerLetter || (currentPuzzle && currentPuzzle.centerLetter);
  let lettersHtml = '';
  if (entry.letters) {
    lettersHtml = '<div class="solution-letters-bar">';
    entry.letters.forEach(l => {
      const isCenter = l === centerLetter;
      lettersHtml += `<span class="solution-letter${isCenter ? ' center' : ''}">${l.toUpperCase()}</span>`;
    });
    lettersHtml += '</div>';
  }
  
  let html = lettersHtml + `
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
  
  // Count found and missed
  const foundCount = entry.foundWords.length;
  const missedCount = puzzle.answers.length - foundCount;
  
  // Add a summary if there are missed words
  if (missedCount > 0) {
    html += `<div class="solution-summary">
      <span class="found-summary">${foundCount} found</span>
      <span class="missed-summary">${missedCount} missed</span>
    </div>`;
  }
  
  Object.keys(byLength).sort((a, b) => a - b).forEach(len => {
    html += `<div class="solution-section"><h3>${len} letters</h3><div class="solution-word-list">`;
    byLength[len].forEach(word => {
      const classes = ['solution-word'];
      const isFound = entry.foundWords.includes(word);
      const isPangram = puzzle.pangrams.includes(word);
      if (isFound) classes.push('found');
      if (!isFound) classes.push('missed');
      if (isPangram) classes.push('pangram');
      html += `<span class="${classes.join(' ')}">${word}</span>`;
    });
    html += '</div></div>';
  });
  
  els.solutionContent.innerHTML = html;
  
  // Update the button based on context
  const btnNext = document.getElementById('btn-next-puzzle');
  
  if (isGiveUp) {
    // When giving up, offer to generate a new puzzle
    btnNext.textContent = 'Generate new puzzle';
    btnNext.onclick = () => nextPuzzle();
  } else {
    // From history or completed - just close
    btnNext.textContent = 'Close';
    btnNext.onclick = () => hideOverlay(els.solutionOverlay);
  }
  
  hideOverlay(els.historyOverlay);
  showOverlay(els.solutionOverlay);
}

// ===== Give Up / Reveal Solution =====
function giveUp() {
  if (!currentPuzzle) return;
  
  // Mark as completed/revealed in history
  const existing = state.history.find(h => h.puzzleId === state.currentPuzzleId);
  if (existing) {
    existing.completed = true;
    existing.revealedAt = Date.now();
  }
  
  // Clear saved puzzle and hints since game is over
  state.currentPuzzle = null;
  state.pangramHintLevel = 0;
  state.extraCharsRevealed = 0;
  saveState();
  
  // Show solution for current puzzle
  const entry = {
    puzzleId: state.currentPuzzleId,
    letters: currentPuzzle.letters,
    centerLetter: currentPuzzle.centerLetter,
    answers: currentPuzzle.answers,
    pangrams: currentPuzzle.pangrams,
    foundWords: [...state.foundWords],
    score: state.score,
    maxPoints: currentPuzzle.maxPoints,
    rank: getCurrentRank(),
  };
  
  showSolution(entry, true);
};

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
  
  // Clear saved puzzle and hints since game is complete
  state.currentPuzzle = null;
  state.pangramHintLevel = 0;
  state.extraCharsRevealed = 0;
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
  // Clear saved puzzle to generate a new one
  state.currentPuzzle = null;
  state.currentPuzzleId++;
  state.pangramHintLevel = 0;
  state.extraCharsRevealed = 0;
  saveState();
  hideOverlay(els.solutionOverlay);
  hideOverlay(els.completeOverlay);
  inputValue = '';
  updateInput();
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
  document.getElementById('btn-hints-close').addEventListener('click', () => {
    hideOverlay(els.hintsOverlay);
  });
  
  // Theme toggle
  els.btnTheme.addEventListener('click', toggleTheme);
  
  // Font size controls
  document.querySelectorAll('.font-size-btn').forEach(btn => {
    btn.addEventListener('click', () => setFontSize(parseInt(btn.dataset.size)));
  });
  
  // History
  els.btnHistory.addEventListener('click', showHistory);
  document.getElementById('btn-history-close').addEventListener('click', () => hideOverlay(els.historyOverlay));
  
  // Solution
  document.getElementById('btn-solution-close').addEventListener('click', () => hideOverlay(els.solutionOverlay));
  
  // Give Up / Reveal Solution
  els.btnGiveUp.addEventListener('click', giveUp);
  
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