(function(){
  const user = requireAuth();
  if(!user) return;

  const $ = (id)=>document.getElementById(id);

  const dict = {
    zh:{
      progress:'进度', rebate:'返利', enter:'进入',
      pendingHint:'已有进行中的任务，已为你打开做单。',
      matchedSub:(cnt,rate)=>`共 ${cnt} 单 · 返利 ${rate}%`,
    },
    en:{
      progress:'Progress', rebate:'Rebate', enter:'Enter',
      pendingHint:'You already have a task; opening it for you.',
      matchedSub:(cnt,rate)=>`Total ${cnt} orders · Rebate ${rate}%`,
    }
  };

  const curLang = ()=> (window.Lang ? Lang.get() : 'zh');
  const tr = (key)=>{
    const lang = curLang();
    return (dict[lang] && dict[lang][key]) || (dict.zh && dict.zh[key]) || key;
  };

  function isToday(value){
    if (!value) return false;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }

  async function renderTop(){
    if (window.refreshBalance) {
      await window.refreshBalance();
    }
    const bal = getUserBalance();
    $("balLine").innerText = bal.toFixed(4);

    const ledger = await publicApiFetch('/api/public/ledger');
    const todayProfit = (Array.isArray(ledger) ? ledger : [])
      .filter((row)=> row.amount > 0 && isToday(row.created_at))
      .reduce((sum, row)=> sum + Number(row.amount || 0), 0);
    $("todayLine").innerText = todayProfit.toFixed(4);
  }

  async function loadTasks(){
    const list = await publicApiFetch('/api/public/tasks');
    return Array.isArray(list) ? list : [];
  }

  function renderCurrent(task){
    const box = $("currentBox");
    const empty = $("currentEmpty");

    if(!task){
      empty.style.display="block";
      box.innerHTML="";
      return;
    }
    empty.style.display="none";

    box.innerHTML = `
      <div class="curCard">
        <div class="curThumb"><img src="./assets/product.svg" alt="product"></div>
        <div class="curInfo">
          <div class="curTitle">${task.template_name || '任务'}</div>
          <div class="curSub">编号 ${task.id} · ${task.created_at || ''}</div>
          <div class="curMeta">
            <span class="badge">${tr("progress")} ${task.status}</span>
            <span class="badge">${tr("rebate")} ${task.amount_min_percent || 0}%</span>
          </div>
        </div>
        <button class="curBtn" id="goDoBtn">${tr("enter")}</button>
      </div>
    `;

    document.getElementById("goDoBtn").onclick = ()=>{
      window.location.href = "./task-do.html?tid=" + encodeURIComponent(task.id);
    };
  }

  async function refresh(){
    await renderTop();
    const tasks = await loadTasks();
    const pending = tasks.find(t=>String(t.status).toLowerCase() === 'pending');
    $("doingLine").innerText = pending ? '1' : '0';
    $("totalLine").innerText = String(tasks.length || 0);
    renderCurrent(pending || tasks[0]);
  }

  if(window.Lang) Lang.bindToggle($("langBtn"));

  $("matchBtn").onclick = async ()=>{
    $("hintLine").innerText = '请等待后台分配任务。';
    await refresh();
  };

  refresh();
  if(window.Lang){
    Lang.apply();
    document.addEventListener('lang:change', ()=>{
      refresh();
      Lang.apply();
    });
  }
})();
