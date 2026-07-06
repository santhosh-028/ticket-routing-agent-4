const API = '/api';

const tabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authError = document.getElementById('authError');

// If already logged in, skip straight to the dashboard.
fetch(`${API}/auth/me`).then((res) => {
  if (res.ok) window.location.href = 'index.html';
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    authError.hidden = true;
    if (tab.dataset.mode === 'login') {
      loginForm.hidden = false;
      signupForm.hidden = true;
    } else {
      loginForm.hidden = true;
      signupForm.hidden = false;
    }
  });
});

function showError(message) {
  authError.textContent = message;
  authError.hidden = false;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.hidden = true;
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error || 'Sign in failed.');
    window.location.href = 'index.html';
  } catch (err) {
    showError('Could not reach the server. Please try again.');
  } finally {
    btn.disabled = false;
  }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.hidden = true;
  const name = document.getElementById('signupName').value.trim();
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value;

  const btn = document.getElementById('signupBtn');
  btn.disabled = true;
  try {
    const res = await fetch(`${API}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password }),
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error || 'Could not create account.');
    window.location.href = 'index.html';
  } catch (err) {
    showError('Could not reach the server. Please try again.');
  } finally {
    btn.disabled = false;
  }
});
