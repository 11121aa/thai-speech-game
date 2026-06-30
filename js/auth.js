const Auth = (function () {
  function pageNameFromPath() {
    return location.pathname.split("/").pop() || "index.html";
  }

  async function getSession() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session;
  }

  async function getRole(userId) {
    if (!sb) return null;
    const { data, error } = await sb
      .from("role")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return data.role;
  }

  async function logActivity(activityType, pageName) {
    const session = await getSession();
    if (!session) return;
    try {
      await sb.from("activity").insert({
        user_id: session.user.id,
        activity_type: activityType,
        page_name: pageName || pageNameFromPath()
      });
    } catch (e) {
      /* non-critical */
    }
  }

  async function logout() {
    const session = await getSession();
    if (session) await logActivity("logout", pageNameFromPath());
    await sb.auth.signOut();
    location.href = "index.html";
  }

  async function requireLogin(redirectTo) {
    const session = await getSession();
    if (!session) {
      location.href = "login.html?redirect=" + encodeURIComponent(redirectTo || pageNameFromPath());
      return null;
    }
    return session;
  }

  async function initNav() {
    const session = await getSession();
    const navGuest = document.getElementById("navGuest");
    const navSelf = document.getElementById("navSelf");

    if (session) {
      if (navGuest) navGuest.style.display = "none";
      if (navSelf) navSelf.style.display = "list-item";
      await logActivity("page_view", pageNameFromPath());
    } else {
      if (navGuest) navGuest.style.display = "list-item";
      if (navSelf) navSelf.style.display = "none";
    }
    return session;
  }

  return {
    getSession: getSession,
    getRole: getRole,
    logActivity: logActivity,
    logout: logout,
    requireLogin: requireLogin,
    initNav: initNav
  };
})();
