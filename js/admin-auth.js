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
      window.location.href = '/admin-login.html';
      return null;
    }
    refreshUser().catch(() => {});
    return getUser();
  }

  async function refreshUser() {
    const token = getToken();
    if (!token) {
      return null;
    }
    const user = await apiFetch('/api/auth/me');
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return user;
  }

  async function apiFetch(path, options) {
    const opts = options || {};
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const method = opts.method || 'GET';
    const res = await fetch(path, Object.assign({}, opts, { headers }));
    console.log(`[admin] api ${method} ${path} -> ${res.status}`);

    const contentType = res.headers.get('content-type') || '';
    let data = null;
    let rawText = '';

    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }
    } else {
      try {
        rawText = await res.text();
      } catch (e) {
        rawText = '';
      }
    }

    if (res.status === 401) {
      clearSession();
      window.location.href = '/admin-login.html';
      throw new Error('登录失效，请重新登录');
    }

    if (res.status === 403) {
      throw new Error('无权限');
    }

    if (!res.ok) {
      if (!data && rawText && /<html|<!doctype/i.test(rawText)) {
        throw new Error('接口异常/反代异常');
      }
      throw new Error(data && data.error ? data.error : `Request failed (${res.status})`);
    }

    if (data && data.success === false) {
      if (data.error && /token/i.test(data.error)) {
        clearSession();
        window.location.href = '/admin-login.html';
      }
      throw new Error(data.error || 'Request failed');
    }

    if (data && Object.prototype.hasOwnProperty.call(data, 'data')) {
      return data.data;
    }

    if (!data && rawText) {
      throw new Error('接口异常/反代异常');
    }

    return data;
  }

  window.adminAuth = {
    getToken,
    setSession,
    clearSession,
    getUser,
    requireAuth,
    refreshUser,
    apiFetch
  };
})();
