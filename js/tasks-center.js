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

  function readJSON(k, d){
    try{ return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); }catch(e){ return d; }
  }
  function writeJSON(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

  function loadState(){
    return readJSON("state", {points:0, doing:0, total:55, doneToday:0, todayProfit:0});
  }
  function saveState(s){ writeJSON("state", s); }

  function loadTasks(){
    const list = readJSON("tasks", []);
    return list.filter(t=>!t.userEmail || t.userEmail===user.email);
  }
  function saveTasks(list){ writeJSON("tasks", list); }

  function nowStr(){
    const d = new Date();
    const pad = (n)=>String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  function uid(){
    return "T" + Math.random().toString(16).slice(2) + Date.now().toString(16);
  }

  function pickDemoTask(){
    const arr = [
      {title:"内容审核任务", img:"./assets/product.svg", amount:62.9500, rewardRate:5},
      {title:"素材标注任务", img:"./assets/product.svg", amount:3534.0000, rewardRate:5},
      {title:"信息采集任务", img:"./assets/product.svg", amount:1770.9700, rewardRate:5},
    ];
    return arr[Math.floor(Math.random()*arr.length)];
  }

  function renderTop(){
    const st = loadState();
    $("balLine").innerText = Number(st.points||0).toFixed(4);
    $("todayLine").innerText = Number(st.todayProfit||0).toFixed(4);

    const tasks = loadTasks();
    const pending = tasks.find(t=>t.status==="PENDING");
    st.doing = pending ? 1 : 0;
    if(!st.total) st.total = 55;
    saveState(st);

    $("doingLine").innerText = String(st.doing||0);
    $("totalLine").innerText = String(st.total||55);
  }

  function renderCurrent(){
    const box = $("currentBox");
    const empty = $("currentEmpty");

    const tasks = loadTasks();
    const task = tasks.find(x=>x.status==="PENDING");
    if(!task){
      empty.style.display="block";
      box.innerHTML="";
      return;
    }
    empty.style.display="none";

    box.innerHTML = `
      <div class="curCard">
        <div class="curThumb"><img src="${task.img||'./assets/product.svg'}" alt="product"></div>
        <div class="curInfo">
          <div class="curTitle">${task.title||"任务"}</div>
          <div class="curSub">编号 ${task.code||"-"} · ${task.createdAt||""}</div>
          <div class="curMeta">
            <span class="badge">${tr("progress")} ${Number(task.step||0)}/${Number(task.totalSteps||20)}</span>
            <span class="badge">${tr("rebate")} ${Number(task.rewardRate||5)}%</span>
          </div>
        </div>
        <button class="curBtn" id="goDoBtn">${tr("enter")}</button>
      </div>
    `;

    document.getElementById("goDoBtn").onclick = ()=>{
      window.location.href = "./task-do.html?tid=" + encodeURIComponent(task.id);
    };
  }

  function showMatching(on){
    $("matching").style.display = on ? "flex" : "none";
  }

  function showDone(t){
    if(!t) return;
    $("doneTitle").innerText = t.title || "任务已分配";
    $("doneSub").innerText = tr("matchedSub")(Number(t.totalSteps||0), Number(t.rewardRate||5));
    $("doneRate").innerText = `${Number(t.rewardRate||5)}%`;
    $("doneCount").innerText = `${Number(t.totalSteps||0)} 单`;
    $("doneCode").innerText = t.code || "-";
    $("matchDone").dataset.tid = t.id;
    $("matchDone").style.display = "flex";
  }

  $("laterBtn").onclick = ()=>{
    $("matchDone").style.display = "none";
  };

  $("goDoBtnDone").onclick = ()=>{
    const tid = $("matchDone").dataset.tid;
    if(tid){
      window.location.href = "./task-do.html?tid=" + encodeURIComponent(tid);
    }
  };

  if(window.Lang) Lang.bindToggle($("langBtn"));

  $("matchBtn").onclick = ()=>{
    const tasks = loadTasks();
    const pending = tasks.find(t=>t.status==="PENDING");
    if(pending){
      $("hintLine").innerText = tr("pendingHint");
      window.location.href = "./task-do.html?tid=" + encodeURIComponent(pending.id);
      return;
    }

    const cnt = parseInt($("countSel").value || "20", 10);
    const demo = pickDemoTask();

    showMatching(true);

    setTimeout(()=>{
      const t = {
        id: uid(),
        userEmail: user.email,
        title: demo.title,
        img: demo.img,
        amount: demo.amount,
        rewardRate: demo.rewardRate,
        totalSteps: cnt,
        step: 0,
        status: "PENDING",
        code: "R" + Math.floor(1000000000000000 + Math.random()*9000000000000000),
        createdAt: nowStr(),
        createdAtTs: Date.now()
      };

      tasks.unshift(t);
      saveTasks(tasks);

      const st = loadState();
      st.doing = 1;
      saveState(st);

      showMatching(false);
      showDone(t);
      renderTop();
      renderCurrent();
      if(window.Lang) Lang.apply();
    }, 1200);
  };

  renderTop();
  renderCurrent();
  if(window.Lang){
    Lang.apply();
    document.addEventListener('lang:change', ()=>{
      renderTop();
      renderCurrent();
      Lang.apply();
    });
  }
})();
