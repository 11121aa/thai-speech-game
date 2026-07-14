// ============================================================
//  ILLUSTRATIONS — maps a word's Thai text to a generated picture,
//  for words that have one (see img/illustrations/manifest.json).
//  Not every word has an illustration yet — callers must always have
//  an emoji/text fallback for words get(...) returns null for.
// ============================================================
var Illustrations = (function () {
  var manifest = null;
  var promise = null;

  // Fetches the manifest once; safe to call multiple times.
  function load() {
    if (promise) return promise;
    promise = fetch('img/illustrations/manifest.json')
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (m) { manifest = m; return m; })
      .catch(function () { manifest = {}; return manifest; });
    return promise;
  }

  // Returns the illustration URL for a word's Thai text, or null.
  // Only meaningful after load() has resolved.
  function get(word) {
    return (manifest && manifest[word]) || null;
  }

  return { load: load, get: get };
}());
