(function(){
  function $(id){ return document.getElementById(id); }

  document.addEventListener("DOMContentLoaded", function(){
    const user = requireAuth();
    if(!user) return;

    $("backBtn").onclick = ()=> window.location.href="./me.html";

    $("email").value = user.email || "-";
    $("nickname").value = user.nickname || "";

    $("saveBtn").onclick = ()=>{
      const nick = $("nickname").value.trim();
      if(!nick) return alert("请输入昵称");

      // 更新 currentUser
      try{
        const u = JSON.parse(localStorage.getItem("currentUser") || "{}");
        u.nickname = nick;
        localStorage.setItem("currentUser", JSON.stringify(u));
      }catch(e){}

      // 同步 users 表（如存在）
      try{
        const email = user.email;
        const users = JSON.parse(localStorage.getItem("users") || "{}");
        if(email && users[email]){
          users[email].nickname = nick;
          localStorage.setItem("users", JSON.stringify(users));
        }
      }catch(e){}

      $("tip").innerText = "已保存";
      setTimeout(()=> window.location.href="./me.html", 400);
    };
  });
})();
