(function(){
  const user = requireAuth();
  if (!user) return;

  const $ = (id)=>document.getElementById(id);

  function toast(msg){
    const t = $("toast");
    t.innerText = msg;
    t.style.display = "block";
    clearTimeout(toast._tm);
    toast._tm = setTimeout(()=>{ t.style.display="none"; }, 1800);
  }

  function openModal(title, body){
    $("modalTitle").innerText = title || "提示";
    $("modalBody").innerText = body || "";
    $("mask").style.display = "grid";
  }
  function closeModal(){ $("mask").style.display = "none"; }

  // 用户显示
  const email = user.email || "";
  const nick = user.nickname || (email ? email.split("@")[0] : "用户");
  $("uName").innerText = nick;
  $("uSub").innerText = email || "已登录";

  // 简单状态（你后续可以换成真实接口）
  function loadState(){
    try{
      return JSON.parse(localStorage.getItem("state") || '{"today":0,"total":0,"pct":64}');
    }catch(e){
      return {today:0,total:0,pct:64};
    }
  }

  const st = loadState();
  $("todayNum").innerText = Number(st.today || 0).toFixed(4);
  $("totalNum").innerText = Number(st.total || 0).toFixed(4);

  const pct = Math.max(0, Math.min(100, Number(st.pct || 64)));
  $("barFill").style.width = pct + "%";
  $("barPct").innerText = String(pct);

  // 本地最近记录
  function loadLog(){
    try{ return JSON.parse(localStorage.getItem("recentLog") || "[]"); }
    catch(e){ return []; }
  }
  function saveLog(arr){
    localStorage.setItem("recentLog", JSON.stringify(arr.slice(0,10)));
  }
  function renderLog(){
    const box = $("logBox");
    const arr = loadLog();
    if (!arr.length){
      box.innerHTML = "";
      $("emptyBox").style.display = "block";
      return;
    }
    $("emptyBox").style.display = "none";
    box.innerHTML = arr.map(it=>(
      '<div class="logItem">' +
        '<div class="logLeft">' +
          '<div class="logT">'+ escapeHtml(it.title || "记录") +'</div>' +
          '<div class="logS">'+ escapeHtml(it.sub || "") +'</div>' +
        '</div>' +
        '<div class="logR">'+ escapeHtml(it.time || "") +'</div>' +
      '</div>'
    )).join("");
  }

  function escapeHtml(s){
    return String(s||"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  }

  // 绑定：返回 / 帮助 / 公告 / 退出
  $("backBtn").onclick = ()=>history.back();
  $("helpBtn").onclick = ()=>openModal("帮助", "如需帮助，请前往“联系客服”或查看常见问题。");
  $("noticeBtn").onclick = ()=>openModal("公告", $("noticeLine").innerText);
  $("closeModal").onclick = closeModal;
  $("okModal").onclick = closeModal;
  $("mask").onclick = (e)=>{ if (e.target.id === "mask") closeModal(); };

  $("logoutBtn").onclick = ()=>{
    logout();
  };

  // 清空记录
  $("clearLogBtn").onclick = ()=>{
    localStorage.removeItem("recentLog");
    renderLog();
    toast("已清空记录");
  };

  // 快捷跳转
  document.querySelectorAll("[data-go]").forEach(btn=>{
    btn.onclick = ()=>{
      const go = btn.getAttribute("data-go");
      if (go) window.location.href = go;
    };
  });

  // 帮助按钮
  $("faqBtn").onclick = ()=>window.location.href = "./records.html";
  $("contactBtn").onclick = ()=>window.location.href = "./contact.html";

  // 首次渲染记录；无记录也不会空白
  renderLog();

  // 如果你想自动塞一条示例记录（可删）
  if (loadLog().length === 0){
    saveLog([{ title:"首次进入工具中心", sub:"系统已为你准备好常用入口", time:new Date().toLocaleString() }]);
    renderLog();
  }
})();
