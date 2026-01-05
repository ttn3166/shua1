(function(){
  const user = requireAuth();
  if (!user) return;

  const name = user.nickname || (user.email ? user.email.split("@")[0] : "用户");
  document.getElementById("meName").innerText = name;
  document.getElementById("meEmail").innerText = user.email || "-";

  // VIP 先固定显示（后续接后端再动态）
  document.getElementById("meVip").innerText = "VIP4";

  // 卡片跳转
  document.querySelectorAll("[data-go]").forEach(btn=>{
    btn.onclick = ()=>window.location.href = btn.getAttribute("data-go");
  });

  document.getElementById("logoutBtn").onclick = ()=>logout();
})();
