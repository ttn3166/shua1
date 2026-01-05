(function(){
  function loadState(){
    try{
      return JSON.parse(localStorage.getItem("state") || '{"points":0,"doing":4,"total":55,"doneToday":0}');
    }catch(e){
      return {points:0,doing:4,total:55,doneToday:0};
    }
  }

  // FAQ 折叠
  function initAccordion(){
    const items = document.querySelectorAll(".accItem");
    items.forEach((btn)=>{
      btn.addEventListener("click", ()=>{
        const ans = btn.nextElementSibling;
        const opened = ans && ans.classList.contains("open");
        document.querySelectorAll(".accA").forEach(a=>a.classList.remove("open"));
        if (ans && !opened) ans.classList.add("open");
      });
    });
  }

  // 示例商品
  const products = [
    { id:"p1", title:"冬季针织提花套头衫", sub:"设计师品牌 · 男士 · M/L", now:89.0000, old:129.9500 },
    { id:"p2", title:"休闲纯棉束脚裤", sub:"城市风 · 男士 · 藏青色", now:62.9500, old:92.0000 },
    { id:"p3", title:"简约休闲卫衣", sub:"日常穿搭 · 中性 · L/XL", now:49.9000, old:79.9000 },
  ];

  function getFav(){
    try{ return JSON.parse(localStorage.getItem("fav") || "{}"); }catch(e){ return {}; }
  }
  function setFav(v){ localStorage.setItem("fav", JSON.stringify(v)); }

  function renderList(){
    const fav = getFav();
    const box = document.getElementById("list");
    if (!box) return;

    box.innerHTML = products.map(p=>{
      const on = fav[p.id] === 1 ? "on" : "";
      const heart = fav[p.id] === 1 ? "♥" : "♡";
      return `
        <div class="item">
          <div class="thumb"><img src="./assets/product.svg" alt="product"></div>
          <div class="meta">
            <p class="title">${p.title}</p>
            <p class="sub">${p.sub}</p>
            <div class="row">
              <div class="price">$${p.now.toFixed(4)}</div>
              <div class="old">$${p.old.toFixed(4)}</div>
            </div>
          </div>
          <button class="heart ${on}" data-id="${p.id}" title="收藏">${heart}</button>
        </div>
      `;
    }).join("");

    box.querySelectorAll(".heart").forEach(btn=>{
      btn.onclick = () => {
        const id = btn.getAttribute("data-id");
        const f = getFav();
        f[id] = f[id] === 1 ? 0 : 1;
        setFav(f);
        renderList();
      };
    });
  }

  function bindNav(){
    document.querySelectorAll(".tab").forEach(t=>{
      t.onclick = () => window.location.href = t.getAttribute("data-go");
    });

    document.querySelectorAll(".qitem").forEach(btn=>{
      btn.onclick = () => {
        const go = btn.getAttribute("data-go");
        if (!go) return;

        if (go.startsWith("#")) {
          const el = document.querySelector(go);
          if (el) el.scrollIntoView({behavior:"smooth"});
        } else {
          window.location.href = go;
        }
      };
    });
  }

  function boot(){
    // requireAuth 来自 common.js（一定要先加载 common.js）
    if (typeof requireAuth !== "function") {
      console.log("[dashboard] requireAuth not found (common.js not loaded?)");
      return;
    }

    const user = requireAuth();
    if (!user) return;

    const nickname = user.nickname || user.name || (user.email ? user.email.split("@")[0] : "用户");
    const nickEl = document.getElementById("nicknameLine");
    if (nickEl) nickEl.innerText = nickname;

    const vipEl = document.getElementById("vipLine");
    if (vipEl) vipEl.innerText = "VIP4";

    const st = loadState();
    const bal = document.getElementById("balLine");
    const doing = document.getElementById("doingLine");
    const total = document.getElementById("totalLine");
    const done = document.getElementById("doneLine");

    if (bal) bal.innerText = Number(st.points||0).toFixed(4);
    if (doing) doing.innerText = String(st.doing||0);
    if (total) total.innerText = String(st.total||55);
    if (done) done.innerText = String(st.doneToday||0);

    const supportBtn = document.getElementById("supportBtn");
    const langBtn = document.getElementById("langBtn");
    const taskBtn = document.getElementById("taskBtn");
    const detailBtn = document.getElementById("detailBtn");
    const shopBtn = document.getElementById("shopBtn");

    if (supportBtn) supportBtn.onclick = () => alert("帮助入口稍后接入");
    if (langBtn) langBtn.onclick = () => alert("语言功能稍后接入");
    if (taskBtn) taskBtn.onclick = () => window.location.href = "./tasks.html";
    if (detailBtn) detailBtn.onclick = () => alert("详情页稍后接入");
    if (shopBtn) shopBtn.onclick = () => alert("列表页稍后接入");

    bindNav();
    renderList();
    initAccordion();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
