(function(){
  function $(id){ return document.getElementById(id); }

  document.addEventListener("DOMContentLoaded", function(){
    $("backBtn").onclick = ()=> history.length > 1 ? history.back() : (window.location.href="./dashboard.html");

    $("openChat").onclick = ()=> {
      // 这里以后换成你的真实客服链接，例如：window.location.href="https://xxx.com/kefu";
      alert("在线客服入口已预留（后续接入真实客服链接）");
    };

    $("openFAQ").onclick = ()=> {
      // 你 dashboard.html 里有 FAQ，可以直接回去并滚动到 FAQ
      window.location.href = "./dashboard.html#faq";
    };

    $("copyEmail").onclick = async ()=> {
      const email = "support@example.com";
      try{
        await navigator.clipboard.writeText(email);
        alert("已复制邮箱：" + email);
      }catch(e){
        alert("复制失败，请手动复制：" + email);
      }
    };

    $("goHome").onclick = ()=> window.location.href="./dashboard.html";
    $("goMe").onclick = ()=> window.location.href="./me.html";
  });
})();
