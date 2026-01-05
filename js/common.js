/* ===== common.js：全站通用（鉴权/导航/余额/流水）===== */
(function () {
  // 小工具
  function $(id){ return document.getElementById(id); }
  function readJSON(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || fallback); }
    catch(e){ return JSON.parse(fallback); }
  }
  function writeJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

  // 用户
  function getCurrentUser() {
    // 1) 新字段：currentUser JSON
    try {
      const u = JSON.parse(localStorage.getItem("currentUser") || "null");
      if (u && (u.email || u.nickname)) return u;
    } catch (e) {}

    // 2) 兼容旧字段：current_user 存邮箱
    const email = localStorage.getItem("current_user");
    const ok = localStorage.getItem("logged_in") === "yes";
    if (ok && email) {
      let nick = "";
      try {
        const users = JSON.parse(localStorage.getItem("users") || "{}");
        nick = (users[email] && (users[email].nickname || users[email].name)) || "";
      } catch (e) {}
      return { email: email, nickname: nick || (email.includes("@") ? email.split("@")[0] : "用户") };
    }
    return null;
  }

  function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "./index.html";
      return null;
    }
    return user;
  }

  function logout() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("logged_in");
    localStorage.removeItem("current_user");
    window.location.href = "./index.html";
  }

  // 余额（可用+冻结）
  function stateKey(email){ return "state_" + String(email||"").toLowerCase(); }

  function loadUserState(email){
    const st = readJSON(stateKey(email), '{"balance":0,"frozen":0}');
    // 兼容旧 points
    if (typeof st.balance !== "number") st.balance = Number(st.balance || 0);
    if (typeof st.frozen !== "number") st.frozen = Number(st.frozen || 0);
    if (st.balance === 0 && typeof st.points === "number") st.balance = Number(st.points || 0);
    return st;
  }

  function saveUserState(email, st){
    writeJSON(stateKey(email), st);
  }

  function getUserBalance(email){
    const st = loadUserState(email);
    return Number(st.balance || 0);
  }

  function setUserBalance(email, v){
    const st = loadUserState(email);
    st.balance = Number(v || 0);
    // 同步旧字段 points（为了你旧页面不报错）
    st.points = st.balance;
    saveUserState(email, st);
  }

  function getUserFrozen(email){
    const st = loadUserState(email);
    return Number(st.frozen || 0);
  }

  function setUserFrozen(email, v){
    const st = loadUserState(email);
    st.frozen = Number(v || 0);
    saveUserState(email, st);
  }

  // 流水 transactions
  function txKey(email){ return "transactions_" + String(email||"").toLowerCase(); }

  function getTransactions(email){
    return readJSON(txKey(email), "[]");
  }

  function addTransaction(email, tx){
    const list = getTransactions(email);
    const item = Object.assign({
      id: "TX_" + Date.now() + "_" + Math.random().toString(16).slice(2),
      ts: Date.now(),
      currency: "USDT",
      chain: "TRC20",
      status: "SUCCESS",
      meta: {}
    }, tx || {});
    list.push(item);
    writeJSON(txKey(email), list);
    return item;
  }

  // 全站导航（关键：修复你说的“点不动”）
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

  // 页面加载后自动绑定
  document.addEventListener("DOMContentLoaded", bindNav);

  // 暴露全局（给各页面 js 用）
  window.getCurrentUser = getCurrentUser;
  window.requireAuth = requireAuth;
  window.logout = logout;

  window.loadUserState = loadUserState;
  window.saveUserState = saveUserState;
  window.getUserBalance = getUserBalance;
  window.setUserBalance = setUserBalance;
  window.getUserFrozen = getUserFrozen;
  window.setUserFrozen = setUserFrozen;

  window.getTransactions = getTransactions;
  window.addTransaction = addTransaction;
})();
