(function(){
  const user = requireAuth();
  if (!user) return;

  const $ = (id)=>document.getElementById(id);

  function kDeposit(email){ return "deposit_records_" + String(email||"").toLowerCase(); }

  function readJSON(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key) || fallback); }
    catch(e){ return JSON.parse(fallback); }
  }
  function writeJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

  function fmt(ts){
    const d=new Date(ts);
    const pad=(n)=>String(n).padStart(2,"0");
    return d.getFullYear()+"/"+pad(d.getMonth()+1)+"/"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes());
  }

  function setMsg(t, ok){
    const m = $("msg");
    m.style.display="block";
    m.className = ok ? "msg ok" : "msg err";
    m.innerText = t;
  }

  function render(){
    const list = readJSON(kDeposit(user.email), "[]").sort((a,b)=>(b.ts||0)-(a.ts||0));
    const box = $("list");
    if (!list.length){
      box.innerHTML = "";
      $("empty").style.display="block";
      return;
    }
    $("empty").style.display="none";

    box.innerHTML = list.slice(0,20).map(x=>{
      const st = x.status || "PENDING";
      const badge = st==="SUCCESS"?"成功":(st==="FAILED"?"失败":"待处理");
      const cls = st==="SUCCESS"?"ok":(st==="FAILED"?"no":"");
      return `
        <div class="row">
          <div class="rTop">
            <div class="rType">充值</div>
            <div class="rBadge ${cls}">${badge}</div>
          </div>
          <div class="rMid">时间：${fmt(x.ts)}<br>链：${x.chain||"TRC20"}<br>TxHash：${x.txHash||"-"}</div>
          <div class="rAmt">+${Number(x.amount||0).toFixed(4)} USDT</div>
        </div>
      `;
    }).join("");
  }

  // 页面控件（你deposit.html里需要这些id：amount, chain, txHash, submitBtn, msg, list, empty）
  const submitBtn = $("submitBtn");
  submitBtn.onclick = function(){
    const amount = Number(($("amount").value || "").trim());
    const chain = ($("chain").value || "TRC20").trim();
    const txHash = ($("txHash").value || "").trim();

    if (!amount || amount <= 0) return setMsg("请输入正确的充值金额", false);
    if (!txHash) return setMsg("请填写 TxHash 或转账凭证编号", false);

    // 1) 写入充值记录（保留旧结构）
    const list = readJSON(kDeposit(user.email), "[]");
    const rec = {
      ts: Date.now(),
      amount: amount,
      chain: chain,
      txHash: txHash,
      status: "PENDING"
    };
    list.push(rec);
    writeJSON(kDeposit(user.email), list);

    // 2) ✅ 写入统一流水 transactions
    addTransaction(user.email, {
      type: "DEPOSIT",
      status: "PENDING",
      amount: amount,       // 充值是正数
      chain: chain,
      meta: { txHash: txHash }
    });

    $("amount").value = "";
    $("txHash").value = "";

    setMsg("充值申请已提交，等待审核入账。", true);
    render();
  };

  // 返回/底部跳转（可选）
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.onclick = ()=>history.back();

  render();
})();
