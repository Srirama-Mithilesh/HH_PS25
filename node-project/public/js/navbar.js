// ---------------------------------------
// NAVBAR LOGIN HANDLING (same as dashboard)
// ---------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  setupAuthNavbar();
});

async function setupAuthNavbar() {
  const authArea = document.getElementById('auth-area');
  if (!authArea) return;

  const token = localStorage.getItem('token');
  console.log("Token:", token);

  // -----------------------------
  // 1) GUEST VIEW
  // -----------------------------
  if (!token) {
    authArea.innerHTML = `
      <a class="nav-link" href="listing.html" id="listingBtn">List your property</a>
      <button class="login-btn" id="loginBtn">Log in / Sign up</button>
    `;

    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
      loginBtn.addEventListener("click", () => {
        window.location.href = "login.html";
      });
    }

    return;
  }

  // -----------------------------
  // 2) LOGGED-IN USER VIEW
  // -----------------------------
  try {
    // Fetch profile
    const res = await fetch('/api/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      localStorage.removeItem('token');
      return setupAuthNavbar(); // Re-render as guest
    }

    const data = await res.json();
    const user = data.user || {};

    // Fetch admin status
    const adminRes = await fetch('/api/is-admin', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const adminData = await adminRes.json();
    const isAdmin = adminData.isAdmin === true;

    const displayName =
      (user.user_metadata && user.user_metadata.name) ||
      user.email ||
      'User';

    // -----------------------------
    // 3) UPDATE NAVBAR FOR LOGGED IN STATES
    // -----------------------------
    authArea.innerHTML = `
      ${isAdmin
        ? `<a class="nav-link" href="admin.html" id="adminBtn">Admin Dashboard</a>`
        : `<a class="nav-link" href="listing.html" id="listingBtn">List your property</a>`
      }
      <span class="user-greeting" id="profileBtn">Hi, ${escapeHtml(displayName)}</span>
      <button class="login-btn" id="logoutBtn">Logout</button>
    `;

    // Profile button
    const profileBtn = document.getElementById("profileBtn");
    if (profileBtn) {
      profileBtn.style.cursor = "pointer";
      profileBtn.addEventListener("click", () => {
        window.location.href = "user.html";
      });
    }

    // Logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem('token');
        window.location.reload();
      });
    }

  } catch (err) {
    console.error("Error loading profile for navbar:", err);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
