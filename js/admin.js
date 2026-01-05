(function(){
  const me = requireAuth();
  if (!me) return;

  const $ = (id)=>document.getElementById(id);

  let active = "DEP"; // DEP / WD
  let currentEmail = (me.email||"").toLowerCase();

  function showMsg(text, ok){
    const m=$("msg");
    m.style.display="block";
    m.className="msg " + (ok?"ok":"err");
    m.innerText=text;
  }

  function keyDeposit(email){ return "deposit_records_" + (email||"").toLowerCase(); }
  function keyWithdraw(email){ return "withdraw_records_" + (email||"").toLowerCase(); }
  function keyState(email){ return "state_" + (email||"").toLowerCase(); }

  function loadJSON(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch(e){ return fallback; }
  }
  function saveJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

  function pad(n){ return String(n).padStart(2,"0"); }
  function fmtTime(ts){
    const d=new Date(ts||Date.now());
    return d.getFullYear()+"/"+pad(d.getMonth()+1)+"/"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds());
  }
  function esc(s){
    return String(s||"").replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  function badge(status){
    if (status==="SUCCESS") return '<span class="badge ok">已完成</span>';
    if (status==="FAILED") return '<span class="badge no">已拒绝</span>';
    return '<span class="badge">待处理</span>';
  }

  function loadPending(){
    if (!currentEmail){
      $("list").innerHTML = `<div class="item"><div class="t">请输入邮箱</div><div class="m">用于定位本地存储记录。</div></div>`;
      return;
    }

    if (active==="DEP"){
      const dep = loadJSON(keyDeposit(currentEmail), []);
      const pending = dep.map((x,i)=>({x,i})).filter(o=>(o.x.status||"PENDING")==="PENDING");
      renderDeposit(pending, dep);
    }else{
      const wd = loadJSON(keyWithdraw(currentEmail), []);
      const pending = wd.map((x,i)=>({x,i})).filter(o=>(o.x.status||"PENDING")==="PENDING");
      renderWithdraw(pending, wd);
    }
  }

  function renderDeposit(pending, all){
    const box = $("list");
    if (!pending.length){
      box.innerHTML = `<div class="item"><div class="t">暂无待处理充值</div><div class="m">当用户提交充值凭证后，会在这里出现。</div></div>`;
      return;
    }

    box.innerHTML = pending.map(o=>{
      const x=o.x;
      return `
        <div class="item">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
            <div class="t">${esc(x.chain||"")} 充值</div>
            ${badge(x.status||"PENDING")}
          </div>
          <div class="noteLine">
            时间：${fmtTime(x.ts)}<br>
            地址：${esc(x.addr||"-")}<br>
            备注：${esc(x.note||"-")}
          </div>

          <div class="ctrlRow">
            <input class="smallInput" id="dep_amt_${o.i}" placeholder="入账金额(必填)" value="${esc(x.amount||"")}">
            <input class="smallInput" id="dep_tx_${o.i}" placeholder="TxHash(可选)" value="${esc(x.txHash||"")}">
            <button class="btn btnPrimary" data-act="dep_ok" data-idx="${o.i}">标记完成</button>
            <button class="btn btnDanger" data-act="dep_no" data-idx="${o.i}">拒绝</button>
          </div>
        </div>
      `;
    }).join("");

    box.querySelectorAll("button[data-act]").forEach(btn=>{
      btn.onclick = ()=>{
        const act = btn.getAttribute("data-act");
        const idx = Number(btn.getAttribute("data-idx"));

        const amtEl = document.getElementById("dep_amt_"+idx);
        const txEl  = document.getElementById("dep_tx_"+idx);
        const amt = Number((amtEl?.value||"").trim());
        const txh = (txEl?.value||"").trim();

        if (act==="dep_ok"){
          if (!Number.isFinite(amt) || amt<=0){
            showMsg("入账金额必须填写且大于 0", false);
            return;
          }

          // 1) 改记录状态
          all[idx].status = "SUCCESS";
          all[idx].amount = amt;
          all[idx].txHash = txh;

          saveJSON(keyDeposit(currentEmail), all);

          // 2) 加余额（points 模拟 USDT）
          const st = loadJSON(keyState(currentEmail), {points:0,doing:4,total:55,doneToday:0});
          st.points = Number(st.points||0) + amt;
          saveJSON(keyState(currentEmail), st);

          showMsg("已标记完成，并已增加余额", true);
          loadPending();
          return;
        }

        if (act==="dep_no"){
          all[idx].status = "FAILED";
          all[idx].txHash = txh;
          saveJSON(keyDeposit(currentEmail), all);
          showMsg("已拒绝该充值记录", true);
          loadPending();
          return;
        }
      };
    });
  }

  function renderWithdraw(pending, all){
    const box = $("list");
    if (!pending.length){
      box.innerHTML = `<div class="item"><div class="t">暂无待处理提现</div><div class="m">当用户提交提现申请后，会在这里出现。</div></div>`;
      return;
    }

    box.innerHTML = pending.map(o=>{
      const x=o.x;
      return `
        <div class="item">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
            <div class="t">${esc(x.chain||"")} 提现</div>
            ${badge(x.status||"PENDING")}
          </div>
          <div class="noteLine">
            金额：${Number(x.amount||0).toFixed(4)}<br>
            地址：${esc(x.addr||"-")}<br>
            时间：${fmtTime(x.ts)}<br>
            备注：${esc(x.note||"-")}
          </div>

          <div class="ctrlRow">
            <input class="smallInput" id="wd_tx_${o.i}" placeholder="TxHash(可选)" value="${esc(x.txHash||"")}">
            <button class="btn btnPrimary" data-act="wd_ok" data-idx="${o.i}">标记已转账</button>
            <button class="btn btnDanger" data-act="wd_no" data-idx="${o.i}">拒绝并退回</button>
          </div>
        </div>
      `;
    }).join("");

    box.querySelectorAll("button[data-act]").forEach(btn=>{
      btn.onclick = ()=>{
        const act = btn.getAttribute("data-act");
        const idx = Number(btn.getAttribute("data-idx"));
        const txEl = document.getElementById("wd_tx_"+idx);
        const txh = (txEl?.value||"").trim();

        if (act==="wd_ok"){
          all[idx].status = "SUCCESS";
          all[idx].txHash = txh;
          saveJSON(keyWithdraw(currentEmail), all);
          showMsg("已标记提现完成", true);
          loadPending();
          return;
        }

        if (act==="wd_no"){
          // 拒绝：退回余额
          all[idx].status = "FAILED";
          all[idx].txHash = txh;
          saveJSON(keyWithdraw(currentEmail), all);

          const st = loadJSON(keyState(currentEmail), {points:0,doing:4,total:55,doneToday:0});
          st.points = Number(st.points||0) + Number(all[idx].amount||0);
          saveJSON(keyState(currentEmail), st);

          showMsg("已拒绝并已退回余额", true);
          loadPending();
          return;
        }
      };
    });
  }

  // ---- UI绑定 ----
  $("backBtn").onclick = ()=>history.back();
  $("meBtn").onclick = ()=>location.href="./me.html";

  $("tabDep").onclick = ()=>{
    active="DEP";
    $("tabDep").classList.add("active");
    $("tabWd").classList.remove("active");
    loadPending();
  };
  $("tabWd").onclick = ()=>{
    active="WD";
    $("tabWd").classList.add("active");
    $("tabDep").classList.remove("active");
    loadPending();
  };

  $("loadBtn").onclick = ()=>{
    const v = $("email").value.trim().toLowerCase();
    currentEmail = v || (me.email||"").toLowerCase();
    if (!currentEmail) return showMsg("当前没有邮箱，无法定位用户记录", false);
    showMsg("已加载用户："+currentEmail, true);
    loadPending();
  };

  // 默认：当前用户
  $("email").value = currentEmail;
  loadPending();
})();
