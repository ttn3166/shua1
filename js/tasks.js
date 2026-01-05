(function(){
  const user = requireAuth();
  if(!user) return;

  const $ = (id)=>document.getElementById(id);

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

  function addTx(tx){
    const list = readJSON("transactions", []);
    list.unshift(tx);
    writeJSON("transactions", list);
  }

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
      {title:"内容审核任务", img:"./assets/product.svg", amount:62.9500, rewardRate:5, totalSteps:20},
      {title:"素材标注任务", img:"./assets/product.svg", amount:3534.0000, rewardRate:5, totalSteps:20},
      {title:"信息采集任务", img:"./assets/product.svg", amount:1770.9700, rewardRate:5, totalSteps:20},
    ];
    return arr[Math.floor(Math.random()*arr.length)];
  }

  function statusCN(s){
    if(s==="PENDING") return "待处理";
    if(s==="DONE") return "已完成";
    if(s==="REJECTED") return "已拒绝";
    return "待处理";
  }
  function statusClass(s){
    if(s==="DONE") return "done";
    if(s==="REJECTED") return "rejected";
    return "pending";
  }

  // 每单需要的“本金”（用任务总金额/总单数）
  function calcNeedEach(task){
    const total = Number(task.amount||0);
    const steps = Number(task.totalSteps||20);
    return steps>0 ? (total/steps) : total;
  }
  // 每单奖励：本金 * rewardRate%
  function calcRewardEach(task){
    const rate = Number(task.rewardRate||5);
    return calcNeedEach(task) * rate / 100;
  }

  // modal
  let currentTaskId = null;
  let currentStars = 5;

  function openModal(task){
    currentTaskId = task.id;

    $("mImg").src = task.img || "./assets/product.svg";
    $("mTitle").innerText = task.title || "—";
    $("mAmount").innerText = Number(task.amount||0).toFixed(4);
    $("mReward").innerText = String(task.rewardRate||5);
    $("mStep").innerText = `${Number(task.step||0)}/${Number(task.totalSteps||20)}`;
    $("mCode").innerText = task.code || "—";
    $("mStatusTag").innerText = statusCN(task.status||"PENDING");

    // stars
    const box = $("stars");
    box.innerHTML = "";
    currentStars = task.stars || 5;
    for(let i=1;i<=5;i++){
      const s = document.createElement("div");
      s.className = "star" + (i<=currentStars ? " on" : "");
      s.innerText = "★";
      s.onclick = ()=>{
        currentStars = i;
        Array.from(box.children).forEach((c,idx)=>{
          c.classList.toggle("on", idx < currentStars);
        });
      };
      box.appendChild(s);
    }

    $("mask").style.display = "block";
    $("modal").style.display = "block";
    $("mBody").scrollTop = 0;

    // 按钮状态：余额不足 → 去记录
    const btn = $("mSubmit");
    if((task.status||"PENDING")!=="PENDING"){
      btn.disabled = true;
      btn.innerText = "已完成";
      btn.onclick = null;
      return;
    }

    const st = loadState();
    const need = calcNeedEach(task);

    if(Number(st.points||0) < need){
      btn.disabled = false;
      btn.innerText = "余额不足，去记录";
      btn.onclick = ()=>{
        localStorage.setItem("need_recharge_task", task.id);
        localStorage.setItem("need_recharge_amount", need.toFixed(4));
        window.location.href = "./records.html";
      };
    }else{
      btn.disabled = false;
      btn.innerText = "提交";
      btn.onclick = submitCurrent;
    }
  }

  function closeModal(){
    $("mask").style.display = "none";
    $("modal").style.display = "none";
    currentTaskId = null;
  }

  $("mask").onclick = closeModal;
  $("mClose").onclick = closeModal;

  function showMatching(on){
    $("matching").style.display = on ? "block" : "none";
  }

  function submitCurrent(){
    const list = loadTasks();
    const idx = list.findIndex(t=>t.id===currentTaskId);
    if(idx<0) return closeModal();

    const t = list[idx];
    if(t.status!=="PENDING") return closeModal();

    const st = loadState();
    const need = calcNeedEach(t);

    // 再次校验余额
    if(Number(st.points||0) < need){
      localStorage.setItem("need_recharge_task", t.id);
      localStorage.setItem("need_recharge_amount", need.toFixed(4));
      window.location.href = "./records.html";
      return;
    }

    // 防重复点击
    const submitBtn = $("mSubmit");
    submitBtn.disabled = true;
    submitBtn.innerText = "提交中...";

    setTimeout(()=>{
      // 扣本金（模拟下单）
      st.points = Number(st.points||0) - need;

      // 返还本金 + 奖励（模拟完成）
      const reward = calcRewardEach(t);
      st.points = st.points + need + reward;

      st.todayProfit = Number(st.todayProfit||0) + reward;
      st.doneToday = Number(st.doneToday||0) + 1;

      // step +1
      t.step = Number(t.step||0) + 1;
      t.stars = currentStars;

      // 写一条流水（每单奖励）
      addTx({
        id: uid(),
        type: "TASK",
        status: "SUCCESS",
        amount: reward,
        chain: "USDT",
        note: `任务奖励：${t.title}（第 ${t.step} 单）`,
        time: nowStr(),
        userEmail: user.email
      });

      // finished
      if(t.step >= Number(t.totalSteps||20)){
        t.status = "DONE";
        st.doing = 0;

        addTx({
          id: uid(),
          type: "TASK_DONE",
          status: "SUCCESS",
          amount: 0,
          chain: "USDT",
          note: `任务完成：${t.title}`,
          time: nowStr(),
          userEmail: user.email
        });
      }

      saveTasks(list);
      saveState(st);

      renderTop();
      renderList();
      openModal(t);
    }, 600);
  }

  // render top
  function renderTop(){
    const st = loadState();
    $("todayLine").innerText = Number(st.todayProfit||0).toFixed(4);
    $("balLine").innerText = Number(st.points||0).toFixed(4);

    const tasks = loadTasks();
    const doing = tasks.some(t=>t.status==="PENDING") ? 1 : 0;
    st.doing = doing;
    if(!st.total) st.total = 55;
    saveState(st);

    $("doingLine").innerText = String(st.doing||0);
    $("totalLine").innerText = String(st.total||55);

    const percent = st.total ? Math.min(100, Math.round((Number(st.doing||0)/Number(st.total||55))*100)) : 0;
    $("percentLine").innerText = String(percent);
    $("pFill").style.width = `${percent}%`;
  }

  // render list
  let filter = "ALL";
  function renderList(){
    const listBox = $("list");
    const empty = $("empty");

    const tasks = loadTasks().slice().sort((a,b)=>{
      return (b.createdAtTs||0) - (a.createdAtTs||0);
    });

    const show = tasks.filter(t=>{
      if(filter==="ALL") return true;
      return t.status===filter;
    });

    if(show.length===0){
      listBox.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    listBox.innerHTML = show.map(t=>{
      const cls = statusClass(t.status);
      const st = statusCN(t.status);
      return `
        <div class="tCard">
          <div class="tTop">
            <div class="tThumb"><img src="${t.img||'./assets/product.svg'}" alt="product"></div>
            <div class="tInfo">
              <div class="tTime">${t.createdAt || ""}</div>
              <div class="tTitle">${t.title || ""}</div>
            </div>
            <div class="tStatus ${cls}">${st}</div>
          </div>

          <div class="tGrid">
            <div class="tBox">
              <div class="tK">总金额</div>
              <div class="tV">${Number(t.amount||0).toFixed(4)}</div>
            </div>
            <div class="tBox">
              <div class="tK">奖励比例</div>
              <div class="tV blue">${Number(t.rewardRate||5)}%</div>
            </div>
            <div class="tBox">
              <div class="tK">进度</div>
              <div class="tV">${Number(t.step||0)}/${Number(t.totalSteps||20)}</div>
            </div>
          </div>

          <div class="tAct">
            ${t.status==="PENDING" ? `<button class="tBtn" data-open="${t.id}">提交</button>` : ``}
          </div>
        </div>
      `;
    }).join("");

    Array.from(document.querySelectorAll("[data-open]")).forEach(btn=>{
      btn.onclick = ()=>{
        const id = btn.getAttribute("data-open");
        openTaskModal(id);
      };
    });
  }

  // expose for records -> tasks?open=
  window.openTaskModal = function(id){
    const tasks = loadTasks();
    const t = tasks.find(x=>x.id===id);
    if(!t) return;
    openModal(t);
  };

  // match
  $("matchBtn").onclick = ()=>{
    const tasks = loadTasks();
    const pending = tasks.find(t=>t.status==="PENDING");
    if(pending){
      openModal(pending);
      return;
    }

    // matching page first
    showMatching(true);

    setTimeout(()=>{
      const demo = pickDemoTask();
      const t = {
        id: uid(),
        userEmail: user.email,
        title: demo.title,
        img: demo.img,
        amount: demo.amount,
        rewardRate: demo.rewardRate,
        totalSteps: demo.totalSteps,
        step: 0,
        status: "PENDING",
        code: "R" + Math.floor(1000000000000000 + Math.random()*9000000000000000),
        createdAt: nowStr(),
        createdAtTs: Date.now(),
        stars: 5
      };

      tasks.unshift(t);
      saveTasks(tasks);

      const st = loadState();
      st.doing = 1;
      saveState(st);

      renderTop();
      renderList();
      showMatching(false);
      openModal(t);
    }, 1200);
  };

  // seg filter
  Array.from(document.querySelectorAll(".seg")).forEach(b=>{
    b.onclick = ()=>{
      Array.from(document.querySelectorAll(".seg")).forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      filter = b.getAttribute("data-status") || "ALL";
      renderList();
    };
  });

  // lang
  $("langBtn").onclick = ()=>alert("语言功能稍后接入");

  // ① records 点继续 -> tasks?open=
  try{
    const u = new URL(location.href);
    const openId = u.searchParams.get("open");
    if(openId){
      setTimeout(()=>{ try{ openTaskModal(openId); }catch(e){} }, 250);
      u.searchParams.delete("open");
      history.replaceState({}, "", u.pathname);
    }
  }catch(e){}

  // ② 余额不足从 records / tab 回来时：自动打开需要充值的任务
  const needId = localStorage.getItem("need_recharge_task");
  if(needId){
    setTimeout(()=>{
      try{ openTaskModal(needId); }catch(e){}
    }, 300);
  }

  renderTop();
  renderList();
})();
