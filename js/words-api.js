const WordsApi = (function () {
  const LEVEL_ORDER = ['Sound', '1 syllable', '2 syllable', '3 syllable', 'Sentences'];

  async function fetchAllWords() {
    if (!sb) return [];
    const { data, error } = await sb
      .from("words")
      .select("*, sounds(id, letter)")
      .order("letter_category", { ascending: true });
    if (error) { console.error(error); return []; }
    return data || [];
  }

  function groupBySound(words) {
    const map = {};
    words.forEach(function (w) {
      const key = w.letter_category;
      if (!map[key]) map[key] = { letter_category: key, sound_id: w.sound_id, words: [] };
      map[key].words.push(w);
    });
    Object.values(map).forEach(function (g) {
      g.words.sort(function (a, b) {
        return LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level);
      });
    });
    return Object.values(map).sort(function (a, b) {
      return a.letter_category.localeCompare(b.letter_category, 'th');
    });
  }

  // Kept for backward compat with game pages that still call these
  async function fetchWordsForAge() {
    return fetchAllWords();
  }

  function groupByExercise(words) {
    return groupBySound(words);
  }

  function pickRandomWord(words) {
    if (!words || !words.length) return null;
    return words[Math.floor(Math.random() * words.length)];
  }

  return {
    fetchAllWords: fetchAllWords,
    fetchWordsForAge: fetchWordsForAge,
    groupBySound: groupBySound,
    groupByExercise: groupByExercise,
    pickRandomWord: pickRandomWord
  };
})();
