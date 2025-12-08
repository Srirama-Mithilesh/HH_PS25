// public/js/login.js

document.addEventListener('DOMContentLoaded', () => {
  // --- Create Lucide icons once ---
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // added this 2 lines fro redirection
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTo = urlParams.get("redirect"); 


  const form = document.getElementById('loginForm');
  const submitBtn = document.getElementById('submitBtn');
  const successModal = document.getElementById('successModal');

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const togglePassword = document.getElementById('togglePassword');
  const googleLoginBtn = document.getElementById('googleLoginBtn');

  // --- If user already has a token, verify it and redirect to dashboard ---
  (function checkLoggedIn() {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (res.ok) {
          const params = new URLSearchParams(window.location.search);
          const redirectUrl = params.get("redirect");

          if (redirectUrl) {
            window.location.href = redirectTo; 
          } else {
            window.location.href = '/dashboard.html';
          }

        } else {
          localStorage.removeItem('token');
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
      });
  })();

  // --- Floating label fix + autofill handling ---
  [emailInput, passwordInput].forEach((input) => {
    if (!input) return;

    // When user types
    input.addEventListener('input', () => {
      input.setAttribute('value', input.value);
    });

    // Trigger once on load (for autofill)
    setTimeout(() => {
      input.setAttribute('value', input.value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, 100);
  });

  // --- Password Toggle Logic ---
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
      const isPassword =
        passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');

      // Just change color of existing icon – do NOT add new icons
      togglePassword.style.color = isPassword ? '#4b5563' : '#9ca3af';
    });
  }

  // Helper: button loading state
  function setButtonLoading(button, isLoading, defaultText = 'Sign In') {
    if (!button) return;

    if (isLoading) {
      const original = button.innerHTML;
      button.dataset.originalText = original;
      button.innerHTML =
        '<i data-lucide="loader-2" style="margin: 0 auto;"></i>';

      if (window.lucide) {
        window.lucide.createIcons();
      }

      const loader = button.querySelector('svg');
      if (loader) {
        loader.animate(
          [
            { transform: 'rotate(0deg)' },
            { transform: 'rotate(360deg)' },
          ],
          {
            duration: 1000,
            iterations: Infinity,
          }
        );
      }
      button.disabled = true;
    } else {
      button.innerHTML = button.dataset.originalText || defaultText;
      button.disabled = false;

      if (window.lucide) {
        window.lucide.createIcons();
      }
    }
  }

  if (!form) return;

  // --- Login submit handler ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      alert('Please fill in both fields.');
      return;
    }

    setButtonLoading(submitBtn, true, 'Sign In');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || 'Login failed');  
        setButtonLoading(submitBtn, false, 'Sign In');
        return;
      }

      // success: save token
      const token = data.token;
      if (token) {
        localStorage.setItem('token', token);
      }

      // show success modal + redirect
      if (successModal) {
        successModal.classList.add('active');
      }

      // setTimeout(() => {
      //   if (successModal) {
      //     successModal.classList.remove('active');
      //   }
      //   setButtonLoading(submitBtn, false, 'Sign In');
      //   window.location.href = '/dashboard.html';
      // }, 1500);
      
        // redirect to current page instead of always to dashboard.html
        setTimeout(() => {
          if (successModal) {
            successModal.classList.remove('active');
          }
          setButtonLoading(submitBtn, false, 'Sign In');

          if (redirectTo) {
            window.location.href = redirectTo;
          } else {
            window.location.href = '/dashboard.html';
          }
        }, 1500);

    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
      setButtonLoading(submitBtn, false, 'Sign In');
    }
  });

    // Go back to current page if close button is clicked instead of dashboard.html
    const closeBtn = document.getElementById("closeLoginBtn");
    if (!closeBtn) return;

    closeBtn.addEventListener("click", () => {
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get("redirect");

      if (redirectUrl) {
        // If login was opened with redirect, go back to that page
        window.location.href = redirectTo;
      } else {
        // If login opened normally, just go back
        window.history.back();
      }
    });

  // --- Google Login placeholder ---
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
      alert('Google Login is not implemented yet.');
    });
  }
});
