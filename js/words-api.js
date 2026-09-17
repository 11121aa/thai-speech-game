const WordsApi = (function () {
  // The therapist's categories, in teaching order: nonsense syllables of
  // 1-3 syllables, then real words of 1-3 syllables, then sentences.
  const LEVEL_ORDER = ['คำ 1 พยางค์ไม่มีความหมาย', 'คำ 2 พยางค์ไม่มีความหมาย', 'คำ 3 พยางค์ไม่มีความหมาย', 'คำ 1 พยางค์ มีความหมาย', 'คำ 2 พยางค์', 'คำ 3 พยางค์', 'ประโยค'];
  // Before 028_new_sounds_and_levels.sql, 1-syllable real words were split by
  // whether they end in a consonant. Rows can still carry those names until
  // the migration has run, so fold them into the merged level here --
  // otherwise they match no filter and silently drop out of every game.
  const LEGACY_LEVELS = {
    'คำ 1 พยางค์ ไม่มีตัวสะกด มีความหมาย': 'คำ 1 พยางค์ มีความหมาย',
    'คำ 1 พยางค์ มีตัวสะกด มีความหมาย': 'คำ 1 พยางค์ มีความหมาย'
  };
  function normalizeLevel(level) {
    return LEGACY_LEVELS[level] || level;
  }

  async function fetchAllWords() {
    if (!sb) return [];
    const { data, error } = await sb
      .from("words")
      .select("*, sounds(id, letter, mouth_animation_url, pronunciation_tip)")
      .order("letter_category", { ascending: true });
    if (error) { console.error(error); return []; }
    (data || []).forEach(function (w) { w.level = normalizeLevel(w.level); });
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
    pickRandomWord: pickRandomWord,
    normalizeLevel: normalizeLevel
  };
})();
