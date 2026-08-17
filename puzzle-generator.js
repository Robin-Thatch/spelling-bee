/**
 * Spelling Bee Puzzle Generator
 * Generates puzzles on-the-fly from the word list in words.js
 */

class PuzzleGenerator {
  constructor() {
    this.words = window.WORDS;
    this.wordsByLetterSet = new Map();
    this.loaded = false;
    this._indexWords();
  }

  _indexWords() {
    for (const word of this.words) {
      const unique = [...new Set(word)].sort().join('');
      if (!this.wordsByLetterSet.has(unique)) {
        this.wordsByLetterSet.set(unique, []);
      }
      this.wordsByLetterSet.get(unique).push(word);
    }
    this.loaded = true;
    console.log('Loaded ' + this.words.length + ' words');
  }

  /**
   * Generate a random puzzle
   * @param {Object} options - Generation options
   * @param {number} options.minWords - Minimum number of words (default: 15)
   * @param {number} options.maxWords - Maximum number of words (default: 80)
   * @param {boolean} options.requirePangram - Require at least one pangram (default: true)
   * @returns {Object|null} Generated puzzle or null if failed
   */
  generate(options = {}) {
    if (!this.loaded) {
      console.error('Word list not loaded');
      return null;
    }

    const {
      minWords = 15,
      maxWords = 80,
      requirePangram = true
    } = options;

    const letterSets = [];
    for (const [key, words] of this.wordsByLetterSet) {
      if (key.length === 7) {
        letterSets.push(key);
      }
    }

    if (letterSets.length === 0) {
      console.error('No valid letter sets found');
      return null;
    }

    const shuffled = letterSets.sort(() => Math.random() - 0.5);

    for (const key of shuffled) {
      const letters = key.split('');
      
      for (const center of letters) {
        const answers = this.findAnswers(letters, center);
        
        if (answers.length < minWords || answers.length > maxWords) continue;
        
        const pangrams = answers.filter(w => this.isPangram(w, letters));
        if (requirePangram && pangrams.length === 0) continue;

        const totalPoints = answers.reduce((sum, w) => {
          const base = w.length === 4 ? 1 : w.length;
          const pangramBonus = pangrams.includes(w) ? 7 : 0;
          return sum + base + pangramBonus;
        }, 0);

        const sortedAnswers = answers.sort((a, b) => a.length - b.length || a.localeCompare(b));

        return {
          letters: letters.sort(),
          centerLetter: center,
          answers: sortedAnswers,
          answerCount: answers.length,
          pangrams,
          maxPoints: totalPoints,
          rankings: [
            { name: 'Beginner', points: 0 },
            { name: 'Good Start', points: Math.floor(totalPoints * 0.02) },
            { name: 'Moving Up', points: Math.floor(totalPoints * 0.05) },
            { name: 'Good', points: Math.floor(totalPoints * 0.08) },
            { name: 'Solid', points: Math.floor(totalPoints * 0.15) },
            { name: 'Nice', points: Math.floor(totalPoints * 0.25) },
            { name: 'Great', points: Math.floor(totalPoints * 0.40) },
            { name: 'Amazing', points: Math.floor(totalPoints * 0.50) },
            { name: 'Genius', points: Math.floor(totalPoints * 0.70) },
            { name: 'Queen Bee', points: totalPoints },
          ],
        };
      }
    }

    console.error('Could not generate puzzle with given constraints');
    return null;
  }

  findAnswers(letters, centerLetter) {
    const letterSet = new Set(letters);
    const answers = [];
    
    for (const word of this.words) {
      if (!word.split('').every(l => letterSet.has(l))) continue;
      if (!word.includes(centerLetter)) continue;
      answers.push(word);
    }
    
    return answers;
  }

  isPangram(word, letters) {
    const wordUnique = [...new Set(word)].sort().join('');
    const letterUnique = [...new Set(letters)].sort().join('');
    return wordUnique === letterUnique;
  }
}

window.PuzzleGenerator = PuzzleGenerator;
