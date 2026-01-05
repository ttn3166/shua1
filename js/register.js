const $ = (id) => document.getElementById(id);

function getUsers() {
  try { return JSON.parse(localStorage.getItem('users') || '{}'); }
  catch (e) { return {}; }
}
function setUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

function showMsg(text, ok = false) {
  const m = $('msg');
  m.className = ok ? 'msg ok' : 'msg';
  m.style.display = 'block';
  m.innerText = text;
}
function clearMsg() {
  const m = $('msg');
  m.style.display = 'none';
  m.innerText = '';
  m.className = 'msg';
}
function setLoading(isLoading) {
  const btn = $('regBtn');
  btn.disabled = isLoading;
  btn.innerText = isLoading ? '注册中...' : '注册';
}

// ====== 验证码：字母数字（人机校验） ======
let currentCaptcha = '';
function randChar() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉 I O 0 1
  return chars[Math.floor(Math.random() * chars.length)];
}
function genCaptcha(len = 5) {
  let s = '';
  for (let i = 0; i < len; i++) s += randChar();
  return s;
}
function renderCaptcha() {
  currentCaptcha = genCaptcha(5);
  $('captchaCode').innerText = currentCaptcha;
}

// 眼睛按钮
$('togglePwd').onclick = () => {
  const el = $('pwd'); el.type = el.type === 'password' ? 'text' : 'password';
};
$('togglePwd2').onclick = () => {
  const el = $('pwd2'); el.type = el.type === 'password' ? 'text' : 'password';
};
$('toggleSafe').onclick = () => {
  const el = $('safePwd'); el.type = el.type === 'password' ? 'text' : 'password';
};

// 验证码点击刷新
$('captchaBox').onclick = renderCaptcha;
renderCaptcha();

$('termsLink').onclick = () => {
  alert('：条款页面后续可以做成 terms.html');
};

$('regForm').addEventListener('submit', function (e) {
  e.preventDefault();
  clearMsg();

  const email = $('email').value.trim();
  const pwd = $('pwd').value.trim();
  const pwd2 = $('pwd2').value.trim();
  const safePwd = $('safePwd').value.trim();
  const nickname = $('nickname').value.trim();
  const invite = $('invite').value.trim();
  const captcha = $('captcha').value.trim().toUpperCase();
  const agree = $('agree').checked;

  if (!email || !pwd || !pwd2 || !safePwd || !nickname) return showMsg('请完整填写必填信息');
  if (!/^\S+@\S+\.\S+$/.test(email)) return showMsg('邮箱格式不正确');

  if (pwd.length < 6 || pwd.length > 16) return showMsg('登录密码需 6-16 位');
  if (pwd !== pwd2) return showMsg('两次登录密码不一致');

  if (!/^\d{6}$/.test(safePwd)) return showMsg('安全密码必须是 6 位数字');

  if (!captcha) return showMsg('请输入验证码');
  if (captcha !== currentCaptcha) {
    renderCaptcha();
    $('captcha').value = '';
    return showMsg('验证码错误，请重新输入');
  }

  if (!agree) return showMsg('请先勾选同意条款与条件');

  const users = getUsers();
  if (users[email]) return showMsg('该邮箱已注册，请直接登录');

  // 保存（：明文，别用真实密码）
  users[email] = { pwd, safePwd, nickname, invite };
  setUsers(users);

  setLoading(true);
  showMsg('注册成功，正在返回登录...', true);

  setTimeout(() => {
    // 记住邮箱，回登录页自动填充
    localStorage.setItem('last_email', email);
    window.location.href = './index.html';
  }, 800);
});
