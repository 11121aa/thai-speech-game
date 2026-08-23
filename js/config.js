// แทนค่า 2 บรรทัดนี้ด้วย Project URL และ anon public key จริงจาก
// Supabase Dashboard > Project Settings > API (ดูขั้นตอนใน README.md)
const APP_CONFIG = {
  SUPABASE_URL: "https://bmufiaydbjiykbuawrwt.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_Xrro3ytNTpRtBGPgIYMucw_N5T111DT",

  // ── FREE_MODE: the ONLY difference between the two versions ──────
  // false = the normal game: coins are earned and spent in the shop,
  //         and upgrades/dishes/clothes/RPG gear unlock as they're bought.
  // true  = everything is already unlocked and the shop is gone.
  //
  // This whole branch of the app is one flag on purpose. The `free-all`
  // git branch differs from `master` by this single line, so any fix
  // made on one merges into the other without conflicts -- rather than
  // two copies of the code drifting apart.
  //
  // Everything that reads it (each is commented FREE_MODE at its site):
  //   js/auth.js            -- hides the shop link in the nav
  //   shop.html             -- shows "everything is free" instead of the shop
  //   game.html             -- treats the whole upgrade catalog as owned
  //   js/game-dressup.js    -- treats every cosmetic as owned
  //   js/game-rpg.js        -- equips the best weapon/armor/skill
  FREE_MODE: false
};

// Convenience reader -- config.js loads before everything else on every
// page, but this stays defensive so a page that somehow loads a script
// out of order fails closed (shop on) rather than throwing.
function isFreeMode() {
  return typeof APP_CONFIG !== "undefined" && APP_CONFIG.FREE_MODE === true;
}
