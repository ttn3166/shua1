const $ = (id) => document.getElementById(id);

function showMsg(text) {
  const m = $('msg');
  if (!m) return alert(text);
  m.style.display = 'block';
  m.innerText = text;
}
function clearMsg() {
  const m = $('msg');
  if (!m) return;
  m.style.display = 'none';
  m.innerText = '';
}

function setLoading(isLoading) {
  const btn = $('loginBtn');
  if (!btn) return;
  btn.disabled = isLoading;
  btn.innerText = isLoading ? '登录中...' : '登录';
}

const langBtn = $('langBtn');
if (langBtn) {
  langBtn.onclick = () => {
    alert('语言功能稍后开放（先把整体网站跑通）。');
  };
}

const togglePwd = $('togglePwd');
if (togglePwd) {
  togglePwd.onclick = function () {
    const el = $('pwd');
    if (!el) return;
    el.type = (el.type === 'password') ? 'text' : 'password';
  };
}

(function preloadEmail(){
  const last = localStorage.getItem('last_email');
  if (last && $('email')) $('email').value = last;
})();

const form = $('loginForm');
if (!form) {
  console.error('找不到 loginForm，请确认 index.html 里 form 的 id="loginForm"');
} else {
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearMsg();

    const emailEl = $('email');
    const pwdEl = $('pwd');
    const email = emailEl ? emailEl.value.trim() : '';
    const pwd = pwdEl ? pwdEl.value.trim() : '';

    if (!email || !pwd) return showMsg('请输入邮箱和密码');
    if (!/^\S+@\S+\.\S+$/.test(email)) return showMsg('邮箱格式不正确');

    setLoading(true);

    try {
      const res = await fetch('/api/public/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pwd })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || '登录失败');
      }

      localStorage.setItem('last_email', email);
      if (window.setPublicSession) {
        window.setPublicSession(data.data.token, data.data.user);
      }

      window.location.href = './dashboard.html';
    } catch (err) {
      showMsg(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  });
}
