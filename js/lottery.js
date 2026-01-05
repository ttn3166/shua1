(function(){
  const user = requireAuth();
  if (!user) return;

  const $ = (id)=>document.getElementById(id);

  function kLottery(email){ return "lottery_records_" + String(email||"").toLowerCase(); }
  function readJSON(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key) || fallback); }
    catch(e){ return JSON.parse(fallback); }
  }
  function writeJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

  function showMsg(t){
    const m=$("msg");
    m.style.display="block";
    m.innerText=t;
  }

  // 抽奖配置
  const COST = 1.0;
  $("cost").innerText = COST.toFixed(4);

  const POOL = [
    { title:"谢谢参与", amount:0.0, prob:0.55 },
    { title:"奖励 0.2 USDT", amount:0.2, prob:0.25 },
    { title:"奖励 0.5 USDT", amount:0.5, prob:0.15 },
    { title:"奖励 1.5 USDT", amount:1.5, prob:0.05 }
  ];

  function pick(){
    const r = Math.random();
    let acc = 0;
    for (const item of POOL){
      acc += item.prob;
      if (r <= acc) return item;
    }
    return POOL[0];
  }

  function fmt(ts){
    const d=new Date(ts);
    const pad=(n)=>String(n).padStart(2,"0");
    return d.getFullYear()+"/"+pad(d.getMonth()+1)+"/"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes());
  }

  function render(){
    const bal = getUserBalance(user.email);
    $("bal").innerText = bal.toFixed(4);

    const list = readJSON(kLottery(user.email), "[]").sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,8);
    if (!list.length){
      $("list").innerHTML="";
      $("empty").style.display="block";
      return;
    }
    $("empty").style.display="none";

    $("list").innerHTML = list.map(x=>{
      const sign = (Number(x.amount||0) >= 0 ? "+" : "");
      const amt = sign + Number(x.amount||0).toFixed(4) + " USDT";
      return `
        <div class="row">
          <div class="rTop">
            <div class="rType">抽奖</div>
            <div class="rBadge ok">完成</div>
          </div>
          <div class="rMid">时间：${fmt(x.ts)}<br>结果：${x.title || "-"}<br>消耗：-${Number(x.cost||0).toFixed(4)} USDT</div>
          <div class="rAmt">${amt}</div>
        </div>
      `;
    }).join("");
  }

  function setLoading(on){
    const b=$("drawBtn");
    b.disabled = on;
    b.innerText = on ? "抽奖中..." : "立即抽奖";
  }

  $("backBtn").onclick = ()=>history.back();
  $("toTxBtn").onclick = ()=>window.location.href="./transactions.html";

  document.querySelectorAll("[data-go]").forEach(btn=>{
    btn.onclick = ()=>window.location.href = btn.getAttribute("data-go");
  });

  $("drawBtn").onclick = function(){
    let bal = getUserBalance(user.email);

    if (bal < COST){
      showMsg("余额不足，无法抽奖。");
      return;
    }

    setLoading(true);
    showMsg("系统处理中，请稍候...");

    setTimeout(()=>{
      // 扣消耗
      bal = bal - COST;

      // 随机结果
      const win = pick();
      const gain = Number(win.amount || 0);

      // 加奖励
      bal = bal + gain;

      // 写回余额
      setUserBalance(user.email, bal);

      // 原抽奖记录（保留）
      const rec = readJSON(kLottery(user.email), "[]");
      rec.push({ ts: Date.now(), title: win.title, amount: gain, cost: COST, status: "SUCCESS" });
      writeJSON(kLottery(user.email), rec);

      // ✅ 新：统一交易流水写两条（更像真实系统）
      // 1) 抽奖消耗（支出）
      addTransaction(user.email, {
        type:"LOTTERY",
        status:"SUCCESS",
        amount: -COST,
        chain:"TRC20",
        meta:{ title:"抽奖消耗" }
      });
      // 2) 抽奖奖励（收入）— 如果 gain=0 就不写
      if (gain > 0){
        addTransaction(user.email, {
          type:"LOTTERY",
          status:"SUCCESS",
          amount: gain,
          chain:"TRC20",
          meta:{ title: win.title }
        });
      }

      setLoading(false);
      showMsg(`抽奖完成：${win.title}（${gain.toFixed(4)} USDT）`);
      render();
    }, 900);
  };

  render();
})();
