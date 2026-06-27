let sb;
try {
  sb = window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);
} catch (e) {
  console.error("ไม่สามารถสร้าง Supabase client ได้ ตรวจสอบ js/config.js:", e);
  sb = null;
}
