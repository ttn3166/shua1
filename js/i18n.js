(function(){
  const KEY = "lang_pref";

  function getLang(){
    const val = (localStorage.getItem(KEY) || "zh").toLowerCase();
    return val === "en" ? "en" : "zh";
  }

  function setLang(val){
    const lang = val === "en" ? "en" : "zh";
    localStorage.setItem(KEY, lang);
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    applyLang();
    try{
      document.dispatchEvent(new CustomEvent('lang:change', { detail:{ lang } }));
    }catch(e){}
  }

  function applyLang(){
    const lang = getLang();
    const isEn = lang === "en";

    document.querySelectorAll("[data-i18n-zh]").forEach(el=>{
      const zh = el.getAttribute("data-i18n-zh");
      const en = el.getAttribute("data-i18n-en") || zh;
      const val = isEn ? en : zh;
      if(val!==null){
        if(el.hasAttribute("data-i18n-html")) el.innerHTML = val;
        else el.textContent = val;
      }
    });

    document.querySelectorAll("[data-i18n-ph-zh]").forEach(el=>{
      const zh = el.getAttribute("data-i18n-ph-zh");
      const en = el.getAttribute("data-i18n-ph-en") || zh;
      const val = isEn ? en : zh;
      if(val!==null) el.setAttribute("placeholder", val);
    });

    document.querySelectorAll("[data-i18n-title-zh]").forEach(el=>{
      const zh = el.getAttribute("data-i18n-title-zh");
      const en = el.getAttribute("data-i18n-title-en") || zh;
      const val = isEn ? en : zh;
      if(val!==null) el.setAttribute("title", val);
    });
  }

  function bindToggle(btn){
    if(!btn) return;
    const refresh = ()=>{
      const lang = getLang();
      btn.textContent = lang === "en" ? "中" : "EN";
      btn.setAttribute("aria-label", lang === "en" ? "切换到中文" : "Switch to English");
    };
    btn.addEventListener("click", ()=>{
      const next = getLang() === "en" ? "zh" : "en";
      setLang(next);
      refresh();
    });
    refresh();
  }

  // auto apply on load
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", applyLang);
  }else{
    applyLang();
  }

  window.Lang = { get:getLang, set:setLang, apply:applyLang, bindToggle:bindToggle };
})();
