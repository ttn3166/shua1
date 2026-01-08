(function(){
  const user = requireAuth();
  if(!user) return;

  const $ = (id)=>document.getElementById(id);

  function getTid(){
    try{
      const u = new URL(location.href);
      return u.searchParams.get("tid") || "";
    }catch(e){
      return "";
    }
  }

  function fmt(value){
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const pad=(n)=>String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function loadTask(){
    const tid = getTid();
    const tasks = await publicApiFetch('/api/public/tasks');
    const list = Array.isArray(tasks) ? tasks : [];
    return list.find(t => String(t.id) === String(tid)) || null;
  }

  async function renderTask(task){
    if (window.refreshBalance) {
      await window.refreshBalance();
    }
    const bal = getUserBalance();

    $("taskNameLine").innerText = task ? task.template_name || '任务' : '未找到任务';
    $("pTitle").innerText = task ? task.template_name || '任务' : '-';
    $("pSub").innerText = task ? `编号 ${task.id} · ${fmt(task.created_at)}` : '-';

    const baseAmount = 100;
    const rewardRate = Number(task ? task.amount_min_percent || 0 : 0);
    const reward = Number(((baseAmount * rewardRate) / 100).toFixed(2));

    $("needLine").innerText = baseAmount.toFixed(4);
    $("rateLine").innerText = rewardRate;
    $("rewardLine").innerText = reward.toFixed(4);
    $("stepLine").innerText = task ? '1' : '0';
    $("totalLine").innerText = task ? String(task.order_count || 0) : '0';
    $("balLine").innerText = bal.toFixed(4);

    const btn = $("submitBtn");
    if (!task) {
      btn.disabled = true;
      $("hintLine").innerText = '任务不存在或已结束。';
      return;
    }
    if (String(task.status).toLowerCase() !== 'pending') {
      btn.disabled = true;
      $("hintLine").innerText = '当前任务已完成。';
      return;
    }

    btn.disabled = false;
    $("hintLine").innerText = '提交后将生成订单与返利记录。';

    btn.onclick = () => openConfirm(task, baseAmount, reward);
  }

  function openConfirm(task, baseAmount, reward){
    $("confirmOrderId").innerText = task.id;
    $("confirmAmount").innerText = `${baseAmount.toFixed(4)} USDT`;
    $("confirmReward").innerText = `${reward.toFixed(4)} USDT`;
    $("confirmProgress").innerText = `1/${task.order_count || 0}`;
    $("confirmMask").classList.add("show");
  }

  function closeConfirm(){
    $("confirmMask").classList.remove("show");
  }

  async function submitTask(task){
    try {
      const result = await publicApiFetch(`/api/public/tasks/${task.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      $("resultTitle").innerText = '提交成功';
      $("resultSub").innerText = '订单已生成，可在记录中心查看。';
      $("resultBill").innerHTML = `
        <div class="billRow"><span>订单号</span><b>${result.order_no}</b></div>
        <div class="billRow"><span>返利</span><b>${result.reward}</b></div>
      `;
      $("resultActions").innerHTML = '<button class="primaryBtn" id="resultOk">返回任务</button>';
      $("resultMask").classList.add("show");
      document.getElementById('resultOk').onclick = () => {
        $("resultMask").classList.remove("show");
        window.location.href = './tasks.html';
      };
    } catch (err) {
      $("resultTitle").innerText = '提交失败';
      $("resultSub").innerText = err.message || '提交失败';
      $("resultBill").innerHTML = '';
      $("resultActions").innerHTML = '<button class="primaryBtn" id="resultOk">关闭</button>';
      $("resultMask").classList.add("show");
      document.getElementById('resultOk').onclick = () => {
        $("resultMask").classList.remove("show");
      };
    }
  }

  $("confirmCancel").onclick = closeConfirm;
  $("backBtn").onclick = () => history.back();

  (async () => {
    const task = await loadTask();
    await renderTask(task);
    $("confirmOk").onclick = () => {
      closeConfirm();
      submitTask(task);
    };
  })();
})();
