/* ===== common.js：全站通用（鉴权/导航/余额/流水）===== */
(function () {
  function $(id){ return document.getElementById(id); }

  const PUBLIC_TOKEN_KEY = 'public_token';
  const PUBLIC_USER_KEY = 'public_user';
  const BALANCE_KEY = 'public_balance';

  function getPublicToken() {
    return localStorage.getItem(PUBLIC_TOKEN_KEY);
  }

  function setPublicSession(token, user) {
    localStorage.setItem(PUBLIC_TOKEN_KEY, token);
    localStorage.setItem(PUBLIC_USER_KEY, JSON.stringify(user));
  }

  function clearPublicSession() {
    localStorage.removeItem(PUBLIC_TOKEN_KEY);
    localStorage.removeItem(PUBLIC_USER_KEY);
    localStorage.removeItem(BALANCE_KEY);
  }

  function getCurrentUser() {
    try {
      const u = JSON.parse(localStorage.getItem(PUBLIC_USER_KEY) || 'null');
      if (u) return u;
    } catch (e) {}

    try {
      const legacy = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (legacy && (legacy.email || legacy.nickname)) return legacy;
    } catch (e) {}

    return null;
  }

  function requireAuth() {
    const token = getPublicToken();
    if (!token) {
      window.location.href = './index.html';
      return null;
    }
    refreshPublicUser().catch(() => {});
    return getCurrentUser();
  }

  async function publicApiFetch(path, options) {
    const opts = options || {};
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    const token = getPublicToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(path, Object.assign({}, opts, { headers }));
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
      rawText = await res.text();
    }

    if (res.status === 401) {
      clearPublicSession();
      window.location.href = './index.html';
      throw new Error('登录失效，请重新登录');
    }

    if (!res.ok) {
      if (!data && rawText && /<html|<!doctype/i.test(rawText)) {
        throw new Error('接口异常/反代异常');
      }
      throw new Error(data && data.error ? data.error : `Request failed (${res.status})`);
    }

    if (data && data.success === false) {
      throw new Error(data.error || 'Request failed');
    }

    if (data && Object.prototype.hasOwnProperty.call(data, 'data')) {
      return data.data;
    }

    return data;
  }

  async function refreshPublicUser() {
    const token = getPublicToken();
    if (!token) return null;
    const user = await publicApiFetch('/api/public/me');
    if (user) {
      localStorage.setItem(PUBLIC_USER_KEY, JSON.stringify(user));
    }
    return user;
  }

  async function refreshBalance() {
    try {
      const data = await publicApiFetch('/api/public/balance');
      if (data && data.balance != null) {
        localStorage.setItem(BALANCE_KEY, String(data.balance));
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  function getUserBalance() {
    const val = localStorage.getItem(BALANCE_KEY);
    return Number(val || 0);
  }

  function logout() {
    clearPublicSession();
    window.location.href = './index.html';
  }

  function bindNav(){
    document.querySelectorAll("[data-go]").forEach(el=>{
      el.addEventListener("click", ()=>{
        const go = el.getAttribute("data-go");
        if (!go) return;
        if (go.startsWith("#")) {
          const target = document.querySelector(go);
          if (target) target.scrollIntoView({behavior:"smooth"});
          return;
        }
        window.location.href = go;
      });
    });
  }

  document.addEventListener("DOMContentLoaded", bindNav);

  window.getCurrentUser = getCurrentUser;
  window.requireAuth = requireAuth;
  window.logout = logout;
  window.publicApiFetch = publicApiFetch;
  window.setPublicSession = setPublicSession;
  window.refreshBalance = refreshBalance;
  window.getUserBalance = getUserBalance;
})();
