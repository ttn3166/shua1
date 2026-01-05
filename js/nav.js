(function(){
  function getFileName(){
    var p = location.pathname || "";
    var n = p.split("/").pop() || "";
    if (!n || n.indexOf(".html") === -1) n = "dashboard.html";
    return n;
  }

  function bind(){
    var tabs = document.querySelectorAll(".tabbar .tab");
    if (!tabs || !tabs.length) return;

    var cur = getFileName();

    tabs.forEach(function(btn){
      var go = btn.getAttribute("data-go") || "";
      var file = (go.split("/").pop() || "").replace(/\?.*$/, "");

      // 高亮
      if (file === cur) btn.classList.add("active");
      else btn.classList.remove("active");

      // 点击跳转
      btn.addEventListener("click", function(){
        if (!go) return;
        if (go.indexOf("#") === 0){
          var el = document.querySelector(go);
          if (el) el.scrollIntoView({behavior:"smooth"});
          return;
        }
        location.href = go;
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
