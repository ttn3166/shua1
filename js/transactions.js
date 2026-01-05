(function(){
  const user = requireAuth();
  if (!user) return;

  const $ = (id)=>document.getElementById(id);

  function typeName(t){
    if (t==="DEPOSIT") return "充值";
    if (t==="WITHDRAW") return "提现";
    if (t==="LOTTERY") return "抽奖";
    return t || "-";
  }
  function statusName(s){
    if (s==="PENDING") return "待处理";
    if (s==="SUCCESS") return "成功";
    if (s==="FAILED") return "失败";
    return s || "-";
  }
  function statusClass(s){
    if (s==="SUCCESS") return "ok";
    if (s==="FAILED") return "no";
    return "";
  }
  function fmt(ts){
    const d = new Date(ts||Date.now());
    const pad=(n)=>String(n).padStart(2,"0");
    return d.getFullYear()+"/"+pad(d.getMonth()+1)+"/"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes());
  }

  function readFallbackOld(){
    // 兼容旧：把 deposit/withdraw/lottery 三份拼起来（万一你以前数据没迁移）
    const email = user.email.toLowerCase();
    const dep = JSON.parse(localStorage.getItem("deposit_records_"+email) || "[]").map(x=>({
      id:"OLD_DEP_"+(x.ts||Date.now()),
      ts:x.ts||Date.now(),
      type:"DEPOSIT",
      status:x.status||"PENDING",
      amount:Number(x.amount||0),
      currency:"USDT",
      chain:x.chain||"TRC20",
      meta:{ txHash: x.txHash||"" }
    }));
    const wit = JSON.parse(localStorage.getItem("withdraw_records_"+email) || "[]").map(x=>({
      id:"OLD_WIT_"+(x.ts||Date.now()),
      ts:x.ts||Date.now(),
      type:"WITHDRAW",
      status:x.status||"PENDING",
      amount:-Math.abs(Number(x.amount||0)),
      currency:"USDT",
      chain:x.chain||"TRC20",
      meta:{ addr: x.addr||"" }
    }));
    const lot = JSON.parse(localStorage.getItem("lottery_records_"+email) || "[]").flatMap(x=>{
      const ts = x.ts||Date.now();
      const cost = Number(x.cost||0);
      const gain = Number(x.amount||0);
      const out = [{
        id:"OLD_LOT_COST_"+ts,
        ts:ts,
        type:"LOTTERY",
        status:"SUCCESS",
        amount:-Math.abs(cost||0),
        currency:"USDT",
        chain:"TRC20",
        meta:{ title:"抽奖消耗" }
      }];
      if (gain>0){
        out.push({
          id:"OLD_LOT_GAIN_"+ts,
          ts:ts+1,
          type:"LOTTERY",
          status:"SUCCESS",
          amount:gain,
          currency:"USDT",
          chain:"TRC20",
          meta:{ title:x.title||"抽奖奖励" }
        });
      }
      return out;
    });

    return dep.concat(wit).concat(lot);
  }

  function loadTx(){
    const list = getTransactions(user.email);
    if (list && list.length) return list;
    return readFallbackOld();
  }

  function render(){
    const typeSel = $("typeSel").value;
    const statusSel = $("statusSel").value;

    let list = loadTx().slice().sort((a,b)=>(b.ts||0)-(a.ts||0));

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
      const money = `${sign}${amt.toFixed(4)} ${x.currency||"USDT"}`;
      const meta = x.meta || {};
      const detailLines = [
        `时间：${fmt(x.ts)}`,
        `链：${x.chain||"TRC20"}`,
        meta.addr ? `地址：${meta.addr}` : "",
        meta.txHash ? `TxHash：${meta.txHash}` : "",
        meta.title ? `备注：${meta.title}` : ""
      ].filter(Boolean).join("<br>");

      return `
        <button class="txRow" data-i="${idx}">
          <div class="txTop">
            <div class="txLeft">
              <div class="txType">${typeName(x.type)}</div>
              <div class="txTime">${fmt(x.ts)}</div>
            </div>
            <div class="txRight">
              <div class="txAmt ${amt<0?'neg':'pos'}">${money}</div>
              <div class="rBadge ${statusClass(x.status)}">${statusName(x.status)}</div>
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
