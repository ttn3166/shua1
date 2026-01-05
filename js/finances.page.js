(function(){
  function $(id){ return document.getElementById(id); }

  function readJSON(key, defVal){
    try{ return JSON.parse(localStorage.getItem(key) || defVal); }
    catch(e){ return JSON.parse(defVal); }
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

  // 余额规则（先本地演示）：基于你的 state.points 作为 USDT 余额
  function getBalance(){
    const st = readJSON("state", '{"points":0}');
    const v = Number(st.points || 0);
    return v;
  }

  function renderRecent(){
    const arr = normalize().slice(0,6);
    const box = $("recentList");
    if(arr.length===0){
      box.innerHTML = '<div class="small">暂无记录</div>';
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
  }

  document.addEventListener("DOMContentLoaded", function(){
    const user = requireAuth();
    if(!user) return;

    $("backBtn").onclick = ()=> window.location.href="./me.html";

    // 余额
    const bal = getBalance();
    $("balNum").innerText = bal.toFixed(4);

    // 提示文案
    $("hintText").innerText = "充值与提现需要运营人员在后台人工处理，提交后请耐心等待。";

    // 按钮跳转
    function go(p){ window.location.href = p; }
    $("goDeposit").onclick = ()=> go("./deposit.html");
    $("goWithdraw").onclick = ()=> go("./withdraw.html");

    $("tileDeposit").onclick = ()=> go("./deposit.html");
    $("tileWithdraw").onclick = ()=> go("./withdraw.html");
    $("tileTx").onclick = ()=> go("./transactions.html");
    $("tileLottery").onclick = ()=> go("./lottery.html");

    $("viewAll").onclick = ()=> go("./transactions.html");

    renderRecent();
  });
})();
