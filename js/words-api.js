const WordsApi = (function () {
  async function fetchWordsForAge(age) {
    if (!sb) return [];
    const { data, error } = await sb
      .from("words")
      .select("*")
      .lte("age_level", age)
      .order("exercise_code", { ascending: true });
    if (error) {
      console.error(error);
      return [];
    }
    return data;
  }

  function groupByExercise(words) {
    const map = {};
    words.forEach(function (w) {
      if (!map[w.exercise_code]) {
        map[w.exercise_code] = {
          exercise_code: w.exercise_code,
          letter_category: w.letter_category,
          age_level: w.age_level,
          words: []
        };
      }
      map[w.exercise_code].words.push(w);
      map[w.exercise_code].age_level = Math.min(map[w.exercise_code].age_level, w.age_level);
    });
    return Object.values(map).sort(function (a, b) {
      return a.age_level - b.age_level || a.exercise_code.localeCompare(b.exercise_code);
    });
  }

  async function fetchAllWords() {
    if (!sb) return [];
    const { data, error } = await sb.from("words").select("*");
    if (error) {
      console.error(error);
      return [];
    }
    return data;
  }

  function pickRandomWord(words) {
    if (!words || !words.length) return null;
    return words[Math.floor(Math.random() * words.length)];
  }

  return {
    fetchWordsForAge: fetchWordsForAge,
    groupByExercise: groupByExercise,
    fetchAllWords: fetchAllWords,
    pickRandomWord: pickRandomWord
  };
})();
