(function(){
  const user = requireAuth();
  if (!user) return;

  const $ = (id)=>document.getElementById(id);

  function kWithdraw(email){ return "withdraw_records_" + String(email||"").toLowerCase(); }

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

  function loadFrozen(){
    const st = loadUserState(user.email);
    return Number(st.frozen || 0);
  }
  function setFrozen(v){
    const st = loadUserState(user.email);
    st.frozen = Number(v);
    // balance字段由 setUserBalance 改
    saveUserState(user.email, st);
  }

  function renderTop(){
    const bal = getUserBalance(user.email);
    const frozen = loadFrozen();
    const balEl = document.getElementById("bal");
    const frzEl = document.getElementById("frozen");
    if (balEl) balEl.innerText = bal.toFixed(4);
    if (frzEl) frzEl.innerText = frozen.toFixed(4);
  }

  function renderList(){
    const list = readJSON(kWithdraw(user.email), "[]").sort((a,b)=>(b.ts||0)-(a.ts||0));
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
            <div class="rType">提现</div>
            <div class="rBadge ${cls}">${badge}</div>
          </div>
          <div class="rMid">时间：${fmt(x.ts)}<br>链：${x.chain||"TRC20"}<br>地址：${x.addr||"-"}</div>
          <div class="rAmt">-${Number(x.amount||0).toFixed(4)} USDT</div>
        </div>
      `;
    }).join("");
  }

  // 页面控件（你withdraw.html里需要这些id：addr, amount, chain, submitBtn, msg, list, empty, bal(可选), frozen(可选)）
  $("submitBtn").onclick = function(){
    const addr = ($("addr").value || "").trim();
    const amount = Number(($("amount").value || "").trim());
    const chain = ($("chain").value || "TRC20").trim();

    if (!addr) return setMsg("请输入提现地址", false);
    if (!amount || amount <= 0) return setMsg("请输入正确的提现金额", false);

    const bal = getUserBalance(user.email);
    if (bal < amount) return setMsg("可用余额不足", false);

    // 1) 扣可用余额
    setUserBalance(user.email, bal - amount);

    // 2) 增加冻结余额
    const frozen = loadFrozen();
    setFrozen(frozen + amount);

    // 3) 写入提现记录（保留旧结构）
    const list = readJSON(kWithdraw(user.email), "[]");
    list.push({
      ts: Date.now(),
      amount: amount,
      addr: addr,
      chain: chain,
      status: "PENDING"
    });
    writeJSON(kWithdraw(user.email), list);

    // 4) ✅ 写入统一流水 transactions（负数支出，PENDING）
    addTransaction(user.email, {
      type: "WITHDRAW",
      status: "PENDING",
      amount: -amount,
      chain: chain,
      meta: { addr: addr }
    });

    $("addr").value = "";
    $("amount").value = "";

    setMsg("提现申请已提交，金额已冻结等待审核。", true);
    renderTop();
    renderList();
  };

  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.onclick = ()=>history.back();

  renderTop();
  renderList();
})();
