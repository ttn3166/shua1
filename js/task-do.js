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
    return "TX" + Math.random().toString(16).slice(2) + Date.now().toString(16);
  }

  function getTid(){
    try{
      const u = new URL(location.href);
      return u.searchParams.get("tid") || "";
    }catch(e){
      return "";
    }
  }

  function calcNeedEach(t){
    const total = Number(t.amount||0);
    const steps = Number(t.totalSteps||20);
    return steps>0 ? (total/steps) : total;
  }
  function calcRewardEach(t){
    const rate = Number(t.rewardRate||5);
    return calcNeedEach(t) * rate / 100;
  }

  function ensureFundsOrGoRecords(need, tid){
    const st = loadState();
    if(Number(st.points||0) < need){
      localStorage.setItem("need_recharge_task", tid);
      localStorage.setItem("need_recharge_amount", need.toFixed(4));
      window.location.href = "./records.html";
      return false;
    }
    return true;
  }

  function render(t){
    const st = loadState();

    $("taskNameLine").innerText = t.title || "任务";
    $("pImg").src = t.img || "./assets/product.svg";
    $("pTitle").innerText = t.title || "—";
    $("pSub").innerText = `编号 ${t.code || "-"} · ${t.createdAt || ""}`;

    const need = calcNeedEach(t);
    const reward = calcRewardEach(t);

    $("needLine").innerText = need.toFixed(4);
    $("rateLine").innerText = String(t.rewardRate||5);
    $("rewardLine").innerText = reward.toFixed(4);

    $("stepLine").innerText = String(Number(t.step||0)+1);
    $("totalLine").innerText = String(Number(t.totalSteps||20));

    $("balLine").innerText = Number(st.points||0).toFixed(4);

    const btn = $("submitBtn");
    if(t.status !== "PENDING"){
      btn.disabled = true;
      btn.innerText = "已完成";
      $("hintLine").innerText = "任务已完成。";
      return;
    }

    // 每次渲染都检查余额，不够就去记录
    if(!ensureFundsOrGoRecords(need, t.id)) return;

    btn.disabled = false;
    btn.innerText = "提交订单";
    $("hintLine").innerText = "";

    btn.onclick = ()=>{
      // 再次检查
      if(!ensureFundsOrGoRecords(need, t.id)) return;

      btn.disabled = true;
      btn.innerText = "提交中...";

      setTimeout(()=>{
        const tasks = loadTasks();
        const idx = tasks.findIndex(x=>x.id===t.id);
        if(idx<0){ window.location.href="./tasks.html"; return; }

        const st2 = loadState();
        const need2 = calcNeedEach(t);
        const reward2 = calcRewardEach(t);

        // 扣本金
        st2.points = Number(st2.points||0) - need2;

        // 返还本金 + 奖励（模拟完成）
        st2.points = st2.points + need2 + reward2;

        st2.todayProfit = Number(st2.todayProfit||0) + reward2;
        st2.doneToday = Number(st2.doneToday||0) + 1;

        tasks[idx].step = Number(tasks[idx].step||0) + 1;

        addTx({
          id: uid(),
          type: "TASK",
          status: "SUCCESS",
          amount: reward2,
          chain: "USDT",
          note: `任务奖励：${tasks[idx].title}（第 ${tasks[idx].step} 单）`,
          time: nowStr(),
          userEmail: user.email
        });

        // 完成任务
        if(tasks[idx].step >= Number(tasks[idx].totalSteps||20)){
          tasks[idx].status = "DONE";
          st2.doing = 0;

          addTx({
            id: uid(),
            type: "TASK_DONE",
            status: "SUCCESS",
            amount: 0,
            chain: "USDT",
            note: `任务完成：${tasks[idx].title}`,
            time: nowStr(),
            userEmail: user.email
          });

          // 清理“余额不足引导”标记
          localStorage.removeItem("need_recharge_task");
          localStorage.removeItem("need_recharge_amount");

          saveTasks(tasks);
          saveState(st2);

          $("hintLine").innerText = "任务已完成，即将返回任务中心…";
          setTimeout(()=> window.location.href="./tasks.html", 700);
          return;
        }

        saveTasks(tasks);
        saveState(st2);

        // 继续下一单
        $("hintLine").innerText = "提交成功，正在加载下一单…";
        setTimeout(()=>{
          location.reload();
        }, 450);

      }, 800);
    };
  }

  $("backBtn").onclick = ()=> window.location.href = "./tasks.html";

  const tid = getTid();
  const tasks = loadTasks();
  const t = tasks.find(x=>x.id===tid) || tasks.find(x=>x.status==="PENDING");

  if(!t){
    window.location.href = "./tasks.html";
    return;
  }

  render(t);
})();
