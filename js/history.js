const GameStore = (function () {
  const KEY_PROFILE = "apl_profile";
  const KEY_PROGRESS = "apl_progress";
  const KEY_HISTORY = "apl_history";
  const MAX_HISTORY = 10;

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* localStorage unavailable, fail silently */
    }
  }

  function getAge() {
    const profile = readJSON(KEY_PROFILE, {});
    return profile.age || null;
  }

  function setAge(age) {
    writeJSON(KEY_PROFILE, { age: age });
  }

  function getProgress() {
    return readJSON(KEY_PROGRESS, {});
  }

  function isLevelUnlocked(groupId, sortedGroupIds) {
    const idx = sortedGroupIds.indexOf(groupId);
    if (idx <= 0) return true;
    const progress = getProgress();
    const prevId = sortedGroupIds[idx - 1];
    return !!(progress[prevId] && progress[prevId].completed);
  }

  function markLevelComplete(groupId, stars, accuracy) {
    const progress = getProgress();
    const existing = progress[groupId] || { completed: false, stars: 0, bestAccuracy: 0 };
    progress[groupId] = {
      completed: true,
      stars: Math.max(existing.stars, stars),
      bestAccuracy: Math.max(existing.bestAccuracy, accuracy)
    };
    writeJSON(KEY_PROGRESS, progress);
  }

  function getHistory() {
    return readJSON(KEY_HISTORY, []);
  }

  function addAttempt(record) {
    const history = getHistory();
    history.unshift({
      word: record.word,
      group: record.group,
      percent: record.percent,
      pass: record.pass,
      timestamp: Date.now()
    });
    writeJSON(KEY_HISTORY, history.slice(0, MAX_HISTORY));
  }

  function getOverallStats() {
    const progress = getProgress();
    let totalStars = 0;
    let levelsCompleted = 0;
    Object.keys(progress).forEach(function (id) {
      if (progress[id].completed) {
        levelsCompleted += 1;
        totalStars += progress[id].stars;
      }
    });
    const history = getHistory();
    return {
      totalStars: totalStars,
      levelsCompleted: levelsCompleted,
      totalAttempts: history.length
    };
  }

  return {
    getAge: getAge,
    setAge: setAge,
    getProgress: getProgress,
    isLevelUnlocked: isLevelUnlocked,
    markLevelComplete: markLevelComplete,
    getHistory: getHistory,
    addAttempt: addAttempt,
    getOverallStats: getOverallStats
  };
})();
