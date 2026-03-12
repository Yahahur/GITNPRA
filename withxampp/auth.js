(function () {
  const STORAGE_ROLE = "NPRA_AUTH_ROLE";
  const USERS = {
    admin: { username: "admin", password: "admin123", role: "admin" },
    user: { username: "user", password: "user123", role: "user" }
  };

  function getRole() {
    return localStorage.getItem(STORAGE_ROLE) || "";
  }

  function isAdmin() {
    return getRole() === "admin";
  }

  function isUser() {
    return getRole() === "user";
  }

  function login(username, password, selectedRole) {
    const entry = USERS[selectedRole];
    if (!entry) return false;
    const ok = username === entry.username && password === entry.password;
    if (ok) {
      localStorage.setItem(STORAGE_ROLE, entry.role);
    }
    return ok;
  }

  function logout() {
    localStorage.removeItem(STORAGE_ROLE);
    window.location.href = "login.html";
  }

  function requireAuth() {
    const file = (window.location.pathname.split("/").pop() || "").toLowerCase();
    const role = getRole();
    if (file === "login.html") {
      if (role) window.location.href = "dashboard.html";
      return;
    }

    if (!role) {
      window.location.href = "login.html";
    }
  }

  window.Auth = { getRole, isAdmin, isUser, login, logout, requireAuth };
})();
