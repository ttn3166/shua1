(function(){
  function $(id){ return document.getElementById(id); }

  document.addEventListener("DOMContentLoaded", function(){
    if(typeof requireAuth !== "function"){
      alert("缺少 ./js/common.js");
      return;
    }

    const user = requireAuth();
    if(!user) return;

    // 顶部按钮
    $("supportBtn").onclick = ()=> window.location.href = "./contact.html";
    $("langBtn").onclick = ()=> alert("语言功能稍后接入");

    // 用户信息
    $("nickLine").innerText = user.nickname || (user.email ? user.email.split("@")[0] : "用户");
    $("emailLine").innerText = user.email || "-";

    // 入口
    $("depositTile").onclick = ()=> window.location.href = "./deposit.html";
    $("withdrawTile").onclick = ()=> window.location.href = "./withdraw.html";
    $("txTile").onclick = ()=> window.location.href = "./transactions.html";
    $("lotteryTile").onclick = ()=> window.location.href = "./lottery.html";

    $("editProfileBtn").onclick = ()=> window.location.href = "./profile.html";
    $("recordsBtn").onclick = ()=> window.location.href = "./records.html";
    $("contactBtn").onclick = ()=> window.location.href = "./contact.html";
    $("goHomeBtn").onclick = ()=> window.location.href = "./dashboard.html";

    $("logoutBtn").onclick = ()=> {
      if(confirm("确认退出登录？")) logout();
    };

    // tab
    document.querySelectorAll(".tab").forEach(t=>{
      t.onclick = ()=> window.location.href = t.getAttribute("data-go");
    });
  });
})();
