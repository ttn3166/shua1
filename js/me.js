(function(){
  const user = requireAuth();
  if (!user) return;

  const name = user.nickname || user.username || "用户";
  document.getElementById("meName").innerText = name;
  document.getElementById("meEmail").innerText = user.username || "-";

  document.getElementById("meVip").innerText = "VIP4";

  document.querySelectorAll("[data-go]").forEach(btn=>{
    btn.onclick = ()=>window.location.href = btn.getAttribute("data-go");
  });

  document.getElementById("logoutBtn").onclick = ()=>logout();
})();
