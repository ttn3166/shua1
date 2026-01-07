(function(){
  const user = requireAuth();
  if(!user) return;

  const $ = (id)=>document.getElementById(id);
  const $$ = (sel)=>Array.from(document.querySelectorAll(sel));

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
      $("hintLine").innerText = "当前订单已完成，记录可在记录中心查询。";
      return;
    }

    // 每次渲染都检查余额，不够就去记录
    if(!ensureFundsOrGoRecords(need, t.id)) return;

    btn.disabled = false;
    btn.innerText = "提交订单";
    $("hintLine").innerText = "系统将生成记录并同步至记录中心。";

    const confirmMask = $("confirmMask");
    const resultMask = $("resultMask");
    const submitOverlay = $("submitOverlay");
    const progressBar = $("progressBar");
    const progressSteps = $$(`#progressSteps .step`);

    function openConfirm(){
      $("confirmOrderId").innerText = t.code || t.id || "-";
      $("confirmAmount").innerText = `${need.toFixed(4)} USDT`;
      $("confirmReward").innerText = `${reward.toFixed(4)} USDT`;
      $("confirmProgress").innerText = `${Number(t.step||0)+1}/${Number(t.totalSteps||20)}`;
      $("confirmNote").innerText = "资金将按流程冻结与释放";
      confirmMask.classList.add("show");
    }

    function closeConfirm(){
      confirmMask.classList.remove("show");
    }

    function openResult(title, sub, billHtml, actionsHtml){
      $("resultTitle").innerText = title;
      $("resultSub").innerText = sub;
      $("resultBill").innerHTML = billHtml;
      $("resultActions").innerHTML = actionsHtml;
      resultMask.classList.add("show");
    }

    function closeResult(){
      resultMask.classList.remove("show");
    }

    function setOverlay(show){
      if(show){
        submitOverlay.classList.add("show");
        progressBar.style.width = "10%";
        progressSteps.forEach((s, i)=>{
          s.classList.remove("done","active");
          if(i===0) s.classList.add("active");
        });
        setTimeout(()=>{
          progressBar.style.width = "45%";
          progressSteps[0].classList.add("done");
          progressSteps[1].classList.add("active");
        }, 320);
        setTimeout(()=>{
          progressBar.style.width = "80%";
          progressSteps[1].classList.add("done");
          progressSteps[2].classList.add("active");
        }, 680);
      }else{
        submitOverlay.classList.remove("show");
      }
    }

    function simulateSubmit(){
      const startAt = Date.now();
      const stBefore = loadState();
      const beforeBalance = Number(stBefore.points||0);
      return new Promise((resolve)=>{
        setTimeout(()=>{
          if(beforeBalance < need){
            resolve({ok:false, reason:"余额不足，当前余额无法覆盖本次扣款。", code:"BALANCE", before:beforeBalance});
            return;
          }
          const r = Math.random();
          if(r < 0.12){
            resolve({ok:false, reason:"网络连接不稳定，请稍后重试。", code:"NETWORK", before:beforeBalance});
            return;
          }
          if(r < 0.2){
            resolve({ok:false, reason:"系统繁忙，建议稍后再试。", code:"BUSY", before:beforeBalance});
            return;
          }
          resolve({ok:true, before:beforeBalance, startedAt:startAt});
        }, 780);
      }).then((result)=>{
        const elapsed = Date.now() - startAt;
        const wait = Math.max(1500 - elapsed, 0);
        return new Promise((resolve)=> setTimeout(()=> resolve(result), wait));
      });
    }

    function finalizeSuccess(){
      const tasks = loadTasks();
      const idx = tasks.findIndex(x=>x.id===t.id);
      if(idx<0){ window.location.href="./tasks.html"; return null; }

      const st2 = loadState();
      const need2 = calcNeedEach(t);
      const reward2 = calcRewardEach(t);
      const beforeBalance = Number(st2.points||0);

      st2.points = beforeBalance - need2;
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

      let finished = false;
      if(tasks[idx].step >= Number(tasks[idx].totalSteps||20)){
        tasks[idx].status = "DONE";
        st2.doing = 0;
        finished = true;

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

        localStorage.removeItem("need_recharge_task");
        localStorage.removeItem("need_recharge_amount");
      }

      saveTasks(tasks);
      saveState(st2);

      return {
        reward: reward2,
        time: nowStr(),
        before: beforeBalance,
        after: Number(st2.points||0),
        finished
      };
    }

    function logFailure(reason){
      addTx({
        id: uid(),
        type: "TASK",
        status: "FAILED",
        amount: 0,
        chain: "USDT",
        note: `提交失败：${reason}`,
        time: nowStr(),
        userEmail: user.email
      });
    }

    $("confirmCancel").onclick = closeConfirm;
    $("confirmOk").onclick = async ()=>{
      closeConfirm();
      setOverlay(true);
      const result = await simulateSubmit();
      setOverlay(false);
      if(!result.ok){
        logFailure(result.reason);
        const billHtml = `
          <div class="billRow"><span>订单号</span><b>${t.code || t.id || "-"}</b></div>
          <div class="billRow"><span>失败原因</span><b>${result.reason}</b></div>
          <div class="billRow"><span>处理时间</span><b>${nowStr()}</b></div>
        `;
        const actionsHtml = `
          <button class="ghostBtn" id="resultRetry">重试</button>
          <button class="primaryBtn" id="resultSupport">联系客服</button>
        `;
        openResult("提交未完成", "请检查网络或稍后重试，记录已保留。", billHtml, actionsHtml);
        $("resultRetry").onclick = ()=>{
          closeResult();
          openConfirm();
        };
        $("resultSupport").onclick = ()=> window.location.href = "./contact.html";
        btn.disabled = false;
        btn.innerText = "提交订单";
        $("hintLine").innerText = "系统已保留记录，可在记录中心查看。";
        return;
      }

      const success = finalizeSuccess();
      if(!success) return;
      const billHtml = `
        <div class="billRow"><span>订单号</span><b>${t.code || t.id || "-"}</b></div>
        <div class="billRow"><span>提交时间</span><b>${success.time}</b></div>
        <div class="billRow"><span>订单金额</span><b class="keyNum">${calcNeedEach(t).toFixed(4)} USDT</b></div>
        <div class="billRow"><span>返利金额</span><b class="keyNum">${success.reward.toFixed(4)} USDT</b></div>
        <div class="billRow"><span>处理状态</span><b>已受理</b></div>
        <div class="billRow"><span>提交前余额</span><b>${success.before.toFixed(4)} USDT</b></div>
        <div class="billRow"><span>提交后余额</span><b>${success.after.toFixed(4)} USDT</b></div>
      `;
      const actionPrimary = success.finished ? "返回任务中心" : "继续下一单";
      const actionsHtml = `
        <button class="ghostBtn" id="resultRecords">查看记录</button>
        <button class="primaryBtn" id="resultNext">${actionPrimary}</button>
      `;
      openResult("提交成功", "记录已生成，可在记录中心查询。", billHtml, actionsHtml);
      $("resultRecords").onclick = ()=> window.location.href = "./records.html";
      $("resultNext").onclick = ()=>{
        closeResult();
        if(success.finished){
          window.location.href = "./tasks.html";
          return;
        }
        location.reload();
      };
      btn.disabled = false;
      btn.innerText = "提交订单";
      $("hintLine").innerText = "订单提交成功，预计 1-3 分钟完成处理。";
    };

    btn.onclick = ()=>{
      if(!ensureFundsOrGoRecords(need, t.id)) return;
      openConfirm();
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
