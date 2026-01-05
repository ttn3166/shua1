(function(){
  function $(id){ return document.getElementById(id); }

  function readJSON(key, defVal){
    try{ return JSON.parse(localStorage.getItem(key) || defVal); }catch(e){ return JSON.parse(defVal); }
  }

  function normalize(){
    const deposits = readJSON("deposits","[]").map(x=>({
      type:"充值", chain:x.chain, amount:null, note:x.note, time:x.time, status:"PENDING"
    }));
    const withdrawals = readJSON("withdrawals","[]").map(x=>({
      type:"提现", chain:x.chain, amount:x.amount, note:x.addr, time:x.time, status:x.status||"PENDING"
    }));
    const lottery = readJSON("lottery_logs","[]").map(x=>({
      type:"抽奖", chain:"-", amount:x.cost, note:x.result, time:x.time, status:"SUCCESS"
    }));

    const all = deposits.concat(withdrawals).concat(lottery);
    all.sort((a,b)=> (new Date(b.time).getTime()||0) - (new Date(a.time).getTime()||0));
    return all;
  }

  function badge(st){
    if(st==="SUCCESS") return `<span class="status succ">成功</span>`;
    if(st==="FAILED") return `<span class="status fail">失败</span>`;
    return `<span class="status pend">待处理</span>`;
  }

  document.addEventListener("DOMContentLoaded", function(){
    const user = requireAuth();
    if(!user) return;

    $("backBtn").onclick = ()=> window.location.href="./me.html";

    const arr = normalize();
    const box = $("list");
    if(arr.length===0){
      box.innerHTML = '<div class="small">暂无明细</div>';
      return;
    }

    box.innerHTML = arr.map(it=>{
      const amt = (it.amount===null || it.amount===undefined) ? "" : ` ${Number(it.amount).toFixed(4)} USDT`;
      return `
        <div class="item">
          <div class="l">
            <div class="t">${it.type}${amt} <span class="badge" style="margin-left:6px">${it.chain}</span></div>
            <div class="s">${it.note || "-"}</div>
            <div class="s">${it.time}</div>
          </div>
          <div class="r">${badge(it.status)}</div>
        </div>
      `;
    }).join("");
  });
})();
