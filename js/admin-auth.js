(function () {
  const TOKEN_KEY = 'admin_token';
  const USER_KEY = 'admin_user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function requireAuth() {
    if (!getToken()) {
      window.location.href = './admin-login.html';
      return null;
    }
    return getUser();
  }

  async function apiFetch(path, options) {
    const opts = options || {};
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(path, Object.assign({}, opts, { headers }));
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      body = null;
    }
    if (!res.ok) {
      throw new Error(body && body.error ? body.error : `Request failed (${res.status})`);
    }
    if (body && body.success === false) {
      throw new Error(body.error || 'Request failed');
    }
    return body && Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : body;
  }

  window.adminAuth = {
    getToken,
    setSession,
    clearSession,
    getUser,
    requireAuth,
    apiFetch
  };
})();
