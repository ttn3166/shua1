(function () {
  const { setSession } = window.adminAuth || {};
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '登录失败');
      }
      setSession(data.data.token, data.data.user);
      window.location.href = 'http://185.39.31.27/admin.html';
    } catch (error) {
      showMsg(error.message || '登录失败', false);
    }
  };
})();
