/* UI experiment B -- the owl guide and the trophy, as flat SVG drawings. */
var KidArtB = (function () {
  var INK = '#2B2340';
  function svg(body, label) {
    return '<svg class="art" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + body + '</svg>';
  }
  return {
    owl: svg(
      '<path d="M14 18 12 4l11 8Z M50 18 52 4l-11 8Z" fill="#5A42D6"/>' +
      '<path d="M32 9c14 0 21 10 21 24 0 15-9 26-21 26S11 48 11 33C11 19 18 9 32 9Z" fill="#7B61FF"/>' +
      '<ellipse cx="32" cy="44" rx="13" ry="13" fill="#CFC4FF"/>' +
      '<path d="M26 40c2 1.5 4 1.5 6 0 2 1.5 4 1.5 6 0M26 47c2 1.5 4 1.5 6 0 2 1.5 4 1.5 6 0" stroke="#A596F2" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="23" cy="27" r="9" fill="#fff"/><circle cx="41" cy="27" r="9" fill="#fff"/>' +
      '<circle class="kb-eye" cx="24" cy="28" r="4.5" fill="' + INK + '"/><circle class="kb-eye" cx="40" cy="28" r="4.5" fill="' + INK + '"/>' +
      '<circle cx="25.5" cy="26.5" r="1.5" fill="#fff"/><circle cx="41.5" cy="26.5" r="1.5" fill="#fff"/>' +
      '<path d="M28.5 35h7L32 40Z" fill="#FFB020"/>' +
      '<path d="M11 36c-4 4-4 10 0 14M53 36c4 4 4 10 0 14" stroke="#5A42D6" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M25 58.5v2.5M29 58.5v2.5M35 58.5v2.5M39 58.5v2.5" stroke="#FFB020" stroke-width="2.6" stroke-linecap="round"/>'),
    trophy: svg(
      '<path d="M16 10H6v6c0 7 5 11 11 11M48 10h10v6c0 7-5 11-11 11" stroke="#E0960A" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M16 6h32v16c0 10-7 18-16 18S16 32 16 22Z" fill="#FFC53D"/>' +
      '<path d="M22 10v11c0 5 3 9 7 10" stroke="#FFE08A" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<rect x="28" y="39" width="8" height="9" fill="#E0960A"/>' +
      '<rect x="19" y="47" width="26" height="10" rx="3" fill="#7A4B1E"/>' +
      '<path d="M32 13l2.4 4.8 5.3.8-3.8 3.7.9 5.3L32 25.1l-4.8 2.5.9-5.3-3.8-3.7 5.3-.8Z" fill="#FFF3C4"/>')
  };
})();
