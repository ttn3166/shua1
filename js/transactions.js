(function(){
  const user = requireAuth();
  if (!user) return;

  const $ = (id)=>document.getElementById(id);

  function typeName(t){
    if (t === "DEPOSIT") return "充值";
    if (t === "WITHDRAW") return "提现";
    if (t === "TASK_REWARD") return "任务奖励";
    if (t === "ADJUST") return "调整";
    if (t === "REVERSAL") return "冲正";
    return t || "-";
  }
  function statusName(s){
    if (s === "PENDING") return "待处理";
    if (s === "SUCCESS") return "成功";
    if (s === "FAILED") return "失败";
    return s || "-";
  }
  function statusClass(s){
    if (s === "SUCCESS") return "ok";
    if (s === "FAILED") return "no";
    return "";
  }
  function fmt(ts){
    const d = new Date(ts || Date.now());
    const pad=(n)=>String(n).padStart(2,"0");
    return d.getFullYear()+"/"+pad(d.getMonth()+1)+"/"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes());
  }

  async function loadTx(){
    const data = await publicApiFetch('/api/public/ledger');
    return Array.isArray(data) ? data : [];
  }

  async function render(){
    const typeSel = $("typeSel").value;
    const statusSel = $("statusSel").value;

    let list = await loadTx();
    list = list.slice().sort((a,b)=>(new Date(b.created_at) - new Date(a.created_at)));

    if (typeSel !== "ALL") list = list.filter(x=>x.type===typeSel);
    if (statusSel !== "ALL") list = list.filter(x=>x.status===statusSel);

    $("hintLine").innerText = `共 ${list.length} 条记录`;

    const box = $("list");
    if (!list.length){
      box.innerHTML="";
      $("empty").style.display="block";
      return;
    }
    $("empty").style.display="none";

    box.innerHTML = list.map((x,idx)=>{
      const amt = Number(x.amount||0);
      const sign = amt>=0 ? "+" : "";
      const money = `${sign}${amt.toFixed(4)} USDT`;
      const detailLines = [
        `时间：${fmt(x.created_at)}`,
        `订单号：${x.order_no || '-'}`,
        `原因：${x.reason || '-'}`
      ].join("<br>");

      return `
        <button class="txRow" data-i="${idx}">
          <div class="txTop">
            <div class="txLeft">
              <div class="txType">${typeName(x.type)}</div>
              <div class="txTime">${fmt(x.created_at)}</div>
            </div>
            <div class="txRight">
              <div class="txAmt ${amt<0?'neg':'pos'}">${money}</div>
              <div class="rBadge ${statusClass(x.status || 'SUCCESS')}">${statusName(x.status || 'SUCCESS')}</div>
            </div>
          </div>
          <div class="txDetail" id="d_${idx}" style="display:none;">${detailLines}</div>
        </button>
      `;
    }).join("");

    box.querySelectorAll(".txRow").forEach(btn=>{
      btn.onclick = ()=>{
        const i = btn.getAttribute("data-i");
        const d = document.getElementById("d_"+i);
        const open = d.style.display === "block";
        document.querySelectorAll(".txDetail").forEach(el=>el.style.display="none");
        d.style.display = open ? "none" : "block";
      };
    });
  }

  $("backBtn").onclick = ()=>history.back();
  document.querySelectorAll("[data-go]").forEach(t=>{
    t.onclick = ()=>window.location.href=t.getAttribute("data-go");
  });

  $("typeSel").onchange = render;
  $("statusSel").onchange = render;

  render();
})();
