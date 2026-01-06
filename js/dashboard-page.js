(function(){
  const langBtn = document.getElementById('langBtn');
  if(window.Lang) Lang.bindToggle(langBtn);

  const getLang = ()=> (window.Lang ? Lang.get() : 'zh');
  const linkEl = document.getElementById('inviteLink');
  const hintEl = document.getElementById('copyHint');
  const copyBtn = document.getElementById('copyInvite');

  const copyText = {
    zh:{ ok:'已复制，快去分享给好友吧', fail:'复制失败，请手动选择复制' },
    en:{ ok:'Copied! Share it with your friends.', fail:'Copy failed, please copy it manually.' }
  };

  function buildLink(){
    const user = (window.getCurrentUser && getCurrentUser()) || null;
    const code = user && user.email ? encodeURIComponent(user.email.split('@')[0]) : 'guest';
    const base = location.origin + location.pathname.replace(/[^\/]+$/, '');
    return `${base}register.html?ref=${code}`;
  }

  const link = buildLink();
  if(linkEl) linkEl.textContent = link;

  if(copyBtn){
    copyBtn.addEventListener('click', async ()=>{
      const lang = getLang();
      try{
        await navigator.clipboard.writeText(link);
        if(hintEl) hintEl.textContent = copyText[lang]?.ok || copyText.zh.ok;
      }catch(e){
        if(hintEl) hintEl.textContent = copyText[lang]?.fail || copyText.zh.fail;
      }
      if(window.Lang) Lang.apply();
    });
  }

  if(window.Lang){
    Lang.apply();
    document.addEventListener('lang:change', ()=>{
      if(linkEl) linkEl.textContent = link;
      Lang.apply();
    });
  }
})();
