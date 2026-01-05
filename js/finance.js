(function(){
  function $(id){ return document.getElementById(id); }

  function bindTopbar(){
    const back = $("backBtn");
    if(back) back.onclick = ()=> history.length > 1 ? history.back() : (window.location.href="./dashboard.html");

    const support = $("supportBtn");
    if(support) support.onclick = ()=> window.location.href="./contact.html";

    const lang = $("langBtn");
    if(lang) lang.onclick = ()=> alert("语言功能稍后接入");
  }

  function bindTabs(active){
    document.querySelectorAll(".tab").forEach(t=>{
      const go = t.getAttribute("data-go");
      if(go === active) t.classList.add("active");
      t.onclick = ()=> window.location.href = go;
    });
  }

  function require(){
    if(typeof requireAuth !== "function"){
      alert("缺少 common.js，请检查 ./js/common.js 是否存在并已引入");
      return null;
    }
    return requireAuth();
  }

  // ====== 交易记录：先用本地存储占位 ======
  function loadTx(){
    try{ return JSON.parse(localStorage.getItem("txs") || "[]"); }catch(e){ return []; }
  }
  function saveTx(list){
    localStorage.setItem("txs", JSON.stringify(list));
  }
  function pushTx(tx){
    const list = loadTx();
    list.unshift(tx);
    saveTx(list);
    return list;
  }

  // 暴露到 window 供页面用
  window.__finance = {
    $,
    bindTopbar,
    bindTabs,
    require,
    loadTx,
    pushTx
  };
})();
