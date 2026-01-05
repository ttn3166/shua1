alert("login.js 已加载");   
const $ = (id) => document.getElementById(id);

function getUsers() {
  try { return JSON.parse(localStorage.getItem('users') || '{}'); }
  catch (e) { return {}; }
}

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

// 语言按钮（暂不实现）
const langBtn = $('langBtn');
if (langBtn) {
  langBtn.onclick = () => {
    alert('语言功能稍后开放（先把整体网站跑通）。');
  };
}

// 密码显示/隐藏
const togglePwd = $('togglePwd');
if (togglePwd) {
  togglePwd.onclick = function () {
    const el = $('pwd');
    if (!el) return;
    el.type = (el.type === 'password') ? 'text' : 'password';
  };
}

// 记住邮箱（更像产品）
(function preloadEmail(){
  const last = localStorage.getItem('last_email');
  if (last && $('email')) $('email').value = last;
})();

const form = $('loginForm');
if (!form) {
  console.error('找不到 loginForm，请确认 index.html 里 form 的 id="loginForm"');
} else {
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearMsg();

    const emailEl = $('email');
    const pwdEl = $('pwd');
    const email = emailEl ? emailEl.value.trim() : '';
    const pwd = pwdEl ? pwdEl.value.trim() : '';

    if (!email || !pwd) return showMsg('请输入邮箱和密码');
    if (!/^\S+@\S+\.\S+$/.test(email)) return showMsg('邮箱格式不正确');

    const users = getUsers();
    if (!users[email]) return showMsg('该邮箱未注册，请先注册');

    if (users[email].pwd !== pwd) return showMsg('密码错误');

    // ✅ 登录成功：保存登录态
    localStorage.setItem('last_email', email);
    localStorage.setItem('logged_in', 'yes');     // 旧字段：保留
    localStorage.setItem('current_user', email);  // 旧字段：保留

    // ✅ 新字段：给 dashboard/common.js 用（重点）
    // 优先用注册时保存的 nickname，没有就用邮箱前缀或默认名
    const nick =
      (users[email] && (users[email].nickname || users[email].name)) ||
      (email.includes('@') ? email.split('@')[0] : 'CoCo.');

    localStorage.setItem('currentUser', JSON.stringify({
      email: email,
      nickname: nick
    }));

    setLoading(true);

    // 模拟 loading（更像真实站）
    setTimeout(() => {
      window.location.href = './dashboard.html';
    }, 600);
  });
}
