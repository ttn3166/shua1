(function () {
  const auth = window.adminAuth;
  const setSession = auth && auth.setSession;
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

    if (!setSession) {
      showMsg('系统初始化失败（adminAuth 未加载）', false);
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
      window.location.href = '/admin.html';

    } catch (err) {
      showMsg(err.message || '登录失败', false);
    }
  };
})();
