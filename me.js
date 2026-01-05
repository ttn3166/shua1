(function(){
  const user = requireAuth();
  if (!user) return;

  const $ = (id)=>document.getElementById(id);

  // 顶部按钮
  const supportBtn = $("supportBtn");
  const langBtn = $("langBtn");
  if (supportBtn) supportBtn.onclick = ()=>window.location.href = "./contact.html";
  if (langBtn) langBtn.onclick = ()=>alert("语言功能后续接入（可做多语言包）。");

  // 用户信息显示
  const email = user.email || localStorage.getItem("current_user") || "";
  const nick = user.nickname || (email && email.includes("@") ? email.split("@")[0] : "用户");

  $("uidLine").innerText = nick || "--";
  $("vipLine").innerText = "VIP4";

  // 邀请码：没有就生成一个固定存起来
  let inv = localStorage.getItem("invite_code");
  if (!inv){
    inv = String(Math.floor(1000000 + Math.random()*8999999));
    localStorage.setItem("invite_code", inv);
  }
  $("inviteLine").innerText = inv;

  // 进度：没有就给默认 64
  let pct = Number(localStorage.getItem("me_pct") || "64");
  if (isNaN(pct)) pct = 64;
  pct = Math.max(0, Math.min(100, pct));
  $("pctLine").innerText = String(pct);
  $("barFill").style.width = pct + "%";

  // 数据：从 state 读（和 dashboard 统一），没有就默认
  function loadState(){
    try{
      return JSON.parse(localStorage.getItem("state") || '{"today":0,"total":0}');
    }catch(e){
      return {today:0,total:0};
    }
  }
  const st = loadState();
  $("todayLine").innerText = Number(st.today || 0).toFixed(4);
  $("totalLine").innerText = Number(st.total || 0).toFixed(4);

  // 列表跳转（data-go）
  document.querySelectorAll("[data-go]").forEach(btn=>{
    btn.onclick = ()=>{
      const go = btn.getAttribute("data-go");
      if (go) window.location.href = go;
    };
  });

  // 退出
  $("logoutBtn").onclick = ()=>logout();

  // 底部 tab（如果你以后要切换 active 也能做）
  document.querySelectorAll(".tabbar .tab").forEach(t=>{
    // 这里不做额外逻辑，保持 html 设置 active
  });
})();
