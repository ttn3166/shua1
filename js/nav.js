(function(){
  var NAV_ITEMS = [
    {href:'./dashboard.html', label:'首页', ico:'🏠'},
    {href:'./tasks.html', label:'任务', ico:'🛒'},
    {href:'./records.html', label:'记录', ico:'🕘'},
    {href:'./me.html', label:'我的', ico:'👤'},
  ];

  function getFileName(){
    var p = location.pathname || "";
    var n = p.split("/").pop() || "";
    if (!n || n.indexOf(".html") === -1) n = "dashboard.html";
    return n.replace(/\?.*$/, "");
  }

  var padEl = null;

  function ensurePad(nav){
    if (!padEl){
      padEl = document.querySelector(".pagePadBottom");
      if (!padEl){
        padEl = document.createElement("div");
        padEl.className = "pagePadBottom";
        document.body.appendChild(padEl);
      }
    }
    setPadHeight(nav);
  }

  function setPadHeight(nav){
    if (!nav) return;
    var h = (nav.getBoundingClientRect().height || nav.offsetHeight || 0);
    if (!h) h = 64;

    if (padEl) padEl.style.height = h + "px";
    document.body.style.paddingBottom = h + "px";

    var app = document.querySelector(".app");
    if (app) app.style.paddingBottom = h + "px";
  }

  function ensureNav(){
    var nav = document.querySelector("nav.tabbar");
    if (!nav){
      nav = document.createElement("nav");
      nav.className = "tabbar";
      nav.setAttribute("role","navigation");
      nav.setAttribute("aria-label","底部导航");
    }

    var tabs = document.createElement("div");
    tabs.className = "tabs";
    NAV_ITEMS.forEach(function(item){
      var btn = document.createElement("button");
      btn.className = "tab";
      btn.type = "button";
      btn.setAttribute("data-go", item.href);

      var ico = document.createElement("div");
      ico.className = "ico";
      ico.textContent = item.ico;

      var span = document.createElement("span");
      span.textContent = item.label;

      btn.appendChild(ico);
      btn.appendChild(span);
      tabs.appendChild(btn);
    });

    nav.innerHTML = "";
    nav.appendChild(tabs);

    // 确保导航在 body 最后，避免被父容器 overflow 截断
    if (nav.parentElement !== document.body){
      document.body.appendChild(nav);
    } else {
      document.body.appendChild(nav);
    }

    return nav;
  }

  function bind(){
    var nav = ensureNav();
    ensurePad(nav);

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

    setPadHeight(nav);
    window.addEventListener("resize", function(){ setPadHeight(nav); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
