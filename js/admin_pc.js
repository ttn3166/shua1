(function(){
  const op = requireAuth();
  if (!op) return;

  const $ = (id)=>document.getElementById(id);

  const AUDIT_KEY = "admin_audit_logs";

  function now(){ return Date.now(); }
  function pad(n){ return String(n).padStart(2,"0"); }
  function fmt(ts){
    const d=new Date(ts||now());
    return d.getFullYear()+"/"+pad(d.getMonth()+1)+"/"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds());
  }
  function esc(s){
    return String(s||"").replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
  function n4(x){ return Number(x||0).toFixed(4); }

  function loadJSON(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch(e){ return fallback; }
  }
  function saveJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

  function keyDeposit(email){ return "deposit_records_" + (email||"").toLowerCase(); }
  function keyWithdraw(email){ return "withdraw_records_" + (email||"").toLowerCase(); }
  function keyState(email){ return "state_" + (email||"").toLowerCase(); }

  function getEmailTarget(){
    const v = ($("emailInp").value||"").trim().toLowerCase();
    return v || String(op.email||"").toLowerCase();
  }

  function writeLog(userEmail, action, amount, note){
    const logs = loadJSON(AUDIT_KEY, []);
    logs.unshift({
      ts: now(),
      operator: op.email || (op.nickname||""),
      user: userEmail,
      action: action,
      amount: Number(amount||0),
      note: String(note||"")
    });
    saveJSON(AUDIT_KEY, logs.slice(0, 1000));
  }

  function calcUserStats(email){
    const st = loadJSON(keyState(email), {points:0,doing:4,total:55,doneToday:0});
    const dep = loadJSON(keyDeposit(email), []);
    const wd  = loadJSON(keyWithdraw(email), []);

    const depOk = dep.filter(x=>x.status==="SUCCESS").reduce((a,b)=>a+Number(b.amount||0),0);
    const wdOk  = wd.filter(x=>x.status==="SUCCESS").reduce((a,b)=>a+Number(b.amount||0),0);

    const depP = dep.filter(x=>(x.status||"PENDING")==="PENDING").length;
    const wdP  = wd.filter(x=>(x.status||"PENDING")==="PENDING").length;

    return { st, dep, wd, depOk, wdOk, depP, wdP };
  }

  function badgeHtml(status){
    if (status==="SUCCESS") return '<span class="badge ok">已完成</span>';
    if (status==="FAILED") return '<span class="badge no">已拒绝</span>';
    return '<span class="badge">待处理</span>';
  }

  function setKpi(email){
    const s = calcUserStats(email);
    $("kBal").innerText = n4(s.st.points||0);
    $("kDepP").innerText = String(s.depP);
    $("kWdP").innerText = String(s.wdP);

    const logs = loadJSON(AUDIT_KEY, []);
    const weekAgo = now() - 7*24*3600*1000;
    const ops7 = logs.filter(x=>x.ts>=weekAgo && String(x.user||"").toLowerCase()===email).length;
    $("kOps7").innerText = String(ops7);

    $("uEmail").innerText = email || "-";
    $("uBal").innerText = n4(s.st.points||0);
    $("uDep").innerText = n4(s.depOk);
    $("uWd").innerText  = n4(s.wdOk);
    $("uDepP").innerText = String(s.depP);
    $("uWdP").innerText  = String(s.wdP);
  }

  function renderPending(email){
    const mode = $("ptypeSel").value; // DEPOSIT / WITHDRAW
    const kw = ($("kwInp").value||"").trim().toLowerCase();

    const s = calcUserStats(email);

    let rows = [];
    if (mode==="DEPOSIT"){
      rows = s.dep.map((x,i)=>({x,i}))
        .filter(o=>(o.x.status||"PENDING")==="PENDING");
    } else {
      rows = s.wd.map((x,i)=>({x,i}))
        .filter(o=>(o.x.status||"PENDING")==="PENDING");
    }

    if (kw){
      rows = rows.filter(o=>{
        const x=o.x;
        const hay = (x.addr+" "+x.note+" "+(x.txHash||"") + " " + (x.chain||"")).toLowerCase();
        return hay.includes(kw);
      });
    }

    const body = $("pendingBody");
    if (!rows.length){
      body.innerHTML = "";
      $("pendingEmpty").style.display = "block";
      return;
    }
    $("pendingEmpty").style.display = "none";

    body.innerHTML = rows.map(o=>{
      const x=o.x;
      const isDep = mode==="DEPOSIT";
      const typ = isDep ? "充值" : "提现";
      const amount = Number(x.amount||0);

      const addrLine = (x.addr?`<div>${esc(x.addr)}</div>`:"");
      const noteLine = (x.note?`<div class="muted">${esc(x.note)}</div>`:"");

      const txVal = esc(x.txHash||"");
      const chain = esc(x.chain||"TRC20");

      return `
        <tr>
          <td>${fmt(x.ts)}</td>
          <td>${typ} ${badgeHtml(x.status||"PENDING")}</td>
          <td>${n4(amount)}</td>
          <td>${addrLine}${noteLine}</td>
          <td>${chain}</td>
          <td>
            <input class="sInp" id="tx_${mode}_${o.i}" placeholder="TxHash" value="${txVal}">
          </td>
          <td>
            <div class="actRow">
              ${isDep ? `<input class="sInp" id="amt_${mode}_${o.i}" placeholder="入账金额" value="${esc(x.amount||"")}">` : ``}
              <input class="sInp" id="note_${mode}_${o.i}" placeholder="备注(可选)" value="">
              <button class="aBtn ok" data-act="OK" data-mode="${mode}" data-idx="${o.i}">通过</button>
              <button class="aBtn no" data-act="NO" data-mode="${mode}" data-idx="${o.i}">拒绝</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    body.querySelectorAll("button[data-act]").forEach(btn=>{
      btn.onclick = ()=>{
        const act = btn.getAttribute("data-act");
        const mode = btn.getAttribute("data-mode");
        const idx = Number(btn.getAttribute("data-idx"));

        if (mode==="DEPOSIT") handleDeposit(email, idx, act);
        else handleWithdraw(email, idx, act);
      };
    });
  }

  function handleDeposit(email, idx, act){
    const dep = loadJSON(keyDeposit(email), []);
    if (!dep[idx] || (dep[idx].status||"PENDING")!=="PENDING") return;

    const tx = (document.getElementById(`tx_DEPOSIT_${idx}`)?.value||"").trim();
    const note = (document.getElementById(`note_DEPOSIT_${idx}`)?.value||"").trim();
    const amtStr = (document.getElementById(`amt_DEPOSIT_${idx}`)?.value||"").trim();
    const amt = Number(amtStr);

    if (act==="OK"){
      if (!Number.isFinite(amt) || amt<=0) {
        alert("入账金额必须填写且大于 0");
        return;
      }

      dep[idx].status = "SUCCESS";
      dep[idx].amount = amt;
      dep[idx].txHash = tx;
      if (note) dep[idx].note = (dep[idx].note ? dep[idx].note + " | " : "") + note;
      saveJSON(keyDeposit(email), dep);

      // 加余额（points 充当 USDT 余额）
      const st = loadJSON(keyState(email), {points:0,doing:4,total:55,doneToday:0});
      st.points = Number(st.points||0) + amt;
      saveJSON(keyState(email), st);

      writeLog(email, "充值通过", amt, note || tx || "");
      refreshAll();
      return;
    }

    if (act==="NO"){
      dep[idx].status = "FAILED";
      dep[idx].txHash = tx;
      if (note) dep[idx].note = (dep[idx].note ? dep[idx].note + " | " : "") + note;
      saveJSON(keyDeposit(email), dep);

      writeLog(email, "充值拒绝", Number(dep[idx].amount||0), note || tx || "");
      refreshAll();
      return;
    }
  }

  function handleWithdraw(email, idx, act){
    const wd = loadJSON(keyWithdraw(email), []);
    if (!wd[idx] || (wd[idx].status||"PENDING")!=="PENDING") return;

    const tx = (document.getElementById(`tx_WITHDRAW_${idx}`)?.value||"").trim();
    const note = (document.getElementById(`note_WITHDRAW_${idx}`)?.value||"").trim();
    const amt = Number(wd[idx].amount||0);

    if (act==="OK"){
      wd[idx].status = "SUCCESS";
      wd[idx].txHash = tx;
      if (note) wd[idx].note = (wd[idx].note ? wd[idx].note + " | " : "") + note;
      saveJSON(keyWithdraw(email), wd);

      writeLog(email, "提现通过", amt, note || tx || "");
      refreshAll();
      return;
    }

    if (act==="NO"){
      wd[idx].status = "FAILED";
      wd[idx].txHash = tx;
      if (note) wd[idx].note = (wd[idx].note ? wd[idx].note + " | " : "") + note;
      saveJSON(keyWithdraw(email), wd);

      // 拒绝退回余额
      const st = loadJSON(keyState(email), {points:0,doing:4,total:55,doneToday:0});
      st.points = Number(st.points||0) + amt;
      saveJSON(keyState(email), st);

      writeLog(email, "提现拒绝并退回", amt, note || tx || "");
      refreshAll();
      return;
    }
  }

  function renderLogs(){
    const logs = loadJSON(AUDIT_KEY, []);
    const body = $("logBody");
    if (!logs.length){
      body.innerHTML = "";
      $("logEmpty").style.display = "block";
      return;
    }
    $("logEmpty").style.display = "none";

    body.innerHTML = logs.slice(0,300).map(x=>`
      <tr>
        <td>${fmt(x.ts)}</td>
        <td>${esc(x.operator||"-")}</td>
        <td>${esc(x.user||"-")}</td>
        <td>${esc(x.action||"-")}</td>
        <td>${n4(x.amount||0)}</td>
        <td>${esc(x.note||"")}</td>
      </tr>
    `).join("");
  }

  function adjustBalance(){
    const email = getEmailTarget();
    if (!email){ alert("请输入用户邮箱"); return; }

    const amt = Number(($("adjAmt").value||"").trim());
    const note = ($("adjNote").value||"").trim();
    const chain = $("adjChain").value || "TRC20";

    if (!Number.isFinite(amt) || amt===0){ alert("金额必须为数字且不能为 0"); return; }

    // 改余额
    const st = loadJSON(keyState(email), {points:0,doing:4,total:55,doneToday:0});
    st.points = Number(st.points||0) + amt;
    saveJSON(keyState(email), st);

    // 生成一条“充值完成”记录（方便在交易明细里看到）
    const dep = loadJSON(keyDeposit(email), []);
    dep.unshift({
      chain: chain,
      amount: Math.abs(amt),
      addr: "-",
      note: (amt>0 ? "人工加余额" : "人工扣余额") + (note ? (" | "+note) : ""),
      txHash: "",
      status: "SUCCESS",
      ts: now()
    });
    saveJSON(keyDeposit(email), dep);

    writeLog(email, amt>0 ? "人工加余额" : "人工扣余额", amt, note);

    const m = $("adjMsg");
    m.style.display="block";
    m.className="msg ok";
    m.innerText = "已完成调整，余额已更新。";

    $("adjAmt").value = "";
    $("adjNote").value = "";

    refreshAll();
  }

  function switchTab(tab){
    document.querySelectorAll(".menu .mi").forEach(b=>b.classList.remove("active"));
    document.querySelector(`.menu .mi[data-tab="${tab}"]`)?.classList.add("active");

    document.querySelectorAll(".tab").forEach(s=>s.style.display="none");
    document.getElementById("tab-"+tab)?.style.display="block";

    const titleMap = {
      pending:"待处理",
      users:"用户资产",
      adjust:"人工调整",
      logs:"操作日志"
    };
    $("pageTitle").innerText = titleMap[tab] || "管理后台";
  }

  function refreshAll(){
    const email = getEmailTarget();
    setKpi(email);
    renderPending(email);
    renderLogs();
  }

  // -------- 绑定事件 --------
  $("opLine").innerText = (op.email || op.nickname || "管理员");

  document.querySelectorAll(".menu .mi[data-tab]").forEach(btn=>{
    btn.onclick = ()=>switchTab(btn.getAttribute("data-tab"));
  });

  $("loadBtn").onclick = refreshAll;
  $("searchBtn").onclick = refreshAll;
  $("resetBtn").onclick = ()=>{
    $("kwInp").value="";
    refreshAll();
  };
  $("ptypeSel").onchange = refreshAll;

  $("adjBtn").onclick = adjustBalance;

  $("logRefresh").onclick = renderLogs;
  $("logClear").onclick = ()=>{
    if (!confirm("确认清空日志？")) return;
    saveJSON(AUDIT_KEY, []);
    renderLogs();
    refreshAll();
  };

  $("logoutBtn").onclick = ()=>{
    logout();
  };

  // 初始：默认当前用户
  $("emailInp").value = String(op.email||"").toLowerCase();
  switchTab("pending");
  refreshAll();
})();
