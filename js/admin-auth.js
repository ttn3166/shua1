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
    const contentType = res.headers.get('content-type') || '';
    let body = null;
    if (contentType.includes('application/json')) {
      try {
        body = await res.json();
      } catch (e) {
        body = null;
      }
    } else {
      const text = await res.text();
      body = text ? { rawText: text } : null;
    }
    if (!res.ok) {
      if (!contentType.includes('application/json')) {
        throw new Error('接口返回非 JSON，请检查后端或 Nginx /api 代理配置。');
      }
      throw new Error(body && body.error ? body.error : `Request failed (${res.status})`);
    }
    if (!contentType.includes('application/json')) {
      throw new Error('接口返回非 JSON，请检查后端或 Nginx /api 代理配置。');
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
