const SpeechTool = (function () {
  let cachedThaiVoice = null;

  if ("speechSynthesis" in window) {
    const pickVoice = function () {
      const voices = window.speechSynthesis.getVoices();
      cachedThaiVoice = voices.find(function (v) { return v.lang && v.lang.toLowerCase().indexOf("th") === 0; }) || null;
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  function isSynthesisSupported() {
    return "speechSynthesis" in window;
  }

  function speak(word) {
    if (!isSynthesisSupported()) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = "th-TH";
    utter.rate = 0.8;
    if (cachedThaiVoice) utter.voice = cachedThaiVoice;
    window.speechSynthesis.speak(utter);
  }

  return {
    isSynthesisSupported: isSynthesisSupported,
    speak: speak
  };
})();
