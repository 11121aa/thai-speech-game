// แทนค่า 2 บรรทัดนี้ด้วย Project URL และ anon public key จริงจาก
// Supabase Dashboard > Project Settings > API (ดูขั้นตอนใน README.md)
const APP_CONFIG = {
  SUPABASE_URL: "https://bmufiaydbjiykbuawrwt.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_Xrro3ytNTpRtBGPgIYMucw_N5T111DT",

  // ── FREE_MODE: everything unlocked, no shop ──────────────────────
  // true  = the only version there is now: every upgrade, dish, outfit
  //         and piece of RPG gear is already owned, and the shop link
  //         never appears. Coins still pile up from play; they just do
  //         not gate anything.
  // false = the old paid-unlock build. Kept working, and kept readable
  //         at every site below, because turning buying back on should
  //         be one line rather than an archaeology project.
  //
  // Everything that reads it (each is commented FREE_MODE at its site):
  //   js/auth.js            -- hides the shop link in the nav
  //   shop.html             -- shows "everything is free" instead of the shop
  //   game.html             -- treats the whole upgrade catalog as owned
  //   js/game-dressup.js    -- treats every cosmetic as owned
  //   js/game-rpg.js        -- equips the best weapon/armor/skill
  //
  // NOTE: master and this branch now agree on the flag, so the two
  // versions of the site are the same. The cache keys stay distinct
  // anyway (`config.js?v=3-free` here, `?v=3` on master): both branches
  // deploy to the SAME GitHub Pages URL, so if the flag ever diverges
  // again a returning visitor would otherwise keep the previously
  // cached config.js -- same URL, opposite flag -- and silently get the
  // wrong version of the site.
  FREE_MODE: true
};

// Convenience reader -- config.js loads before everything else on every
// page, but this stays defensive so a page that somehow loads a script
// out of order fails closed (shop on) rather than throwing.
function isFreeMode() {
  return typeof APP_CONFIG !== "undefined" && APP_CONFIG.FREE_MODE === true;
}
