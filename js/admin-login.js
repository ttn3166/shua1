(function () {
  const { setSession, apiFetch } = window.adminAuth || {};
  const $ = (id) => document.getElementById(id);

  function showMsg(text, ok) {
    const msg = $('msg');
    msg.style.display = 'block';
    msg.className = 'msg ' + (ok ? 'ok' : 'err');
    msg.innerText = text;
  }

  $('backBtn').onclick = () => history.back();

  $('loginBtn').onclick = async () => {
    const username = $('username').value.trim();
    const password = $('password').value.trim();
    if (!username || !password) {
      showMsg('请输入用户名和密码', false);
      return;
    }
    try {
      const data = apiFetch
        ? await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
          })
        : null;
      if (!data || !data.token) {
        throw new Error('登录失败');
      }
      setSession(data.token, data.user);
      window.location.href = 'http://185.39.31.27/admin.html';
    } catch (error) {
      showMsg(error.message || '登录失败', false);
    }
  };
})();
