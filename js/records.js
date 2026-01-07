(function(){
  const user = requireAuth();
  if(!user) return;

  const $ = (id)=>document.getElementById(id);

  const dict = {
    zh:{
      status:{PENDING:'处理中', DONE:'成功', REJECTED:'失败'},
      txStatus:{SUCCESS:'成功', FAILED:'失败', PENDING:'处理中'},
      insufficientTitle:'余额不足提醒',
      insufficientBody:(amt)=>`当前订单需要可用余额 ≥ <b>${amt || '0.00'}</b>（USDT）。记录已生成，可在记录中心查询，请先完成充值后继续。`,
      goDeposit:'去充值', goTask:'返回任务',
      segTask:'任务记录', segTx:'交易流水',
      amount:'金额', progress:'进度', currency:'币种',
      continue:'继续提交', viewTx:'查看流水',
      txDetail:'交易明细'
    },
    en:{
      status:{PENDING:'In progress', DONE:'Completed', REJECTED:'Rejected'},
      txStatus:{SUCCESS:'Success', FAILED:'Failed', PENDING:'In progress'},
      insufficientTitle:'Insufficient balance',
      insufficientBody:(amt)=>`This order requires available funds ≥ <b>${amt || '0.00'}</b> USDT. A record has been created. Please top up before continuing.`,
      goDeposit:'Deposit', goTask:'Back to tasks',
      segTask:'Task history', segTx:'Transactions',
      amount:'Amount', progress:'Progress', currency:'Currency',
      continue:'Continue', viewTx:'View transactions',
      txDetail:'Transaction details'
    }
  };

  const curLang = ()=> (window.Lang ? Lang.get() : 'zh');
  const tr = (key, fallback)=>{
    const lang = curLang();
    if(key.includes('.')){
      const [k1,k2] = key.split('.');
      return (dict[lang] && dict[lang][k1] && dict[lang][k1][k2]) || (dict.zh && dict.zh[k1] && dict.zh[k1][k2]) || fallback || key;
    }
    return (dict[lang] && dict[lang][key]) || (dict.zh && dict.zh[key]) || fallback || key;
  };

  function readJSON(k, d){
    try{ return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); }catch(e){ return d; }
  }

  function writeJSON(k, v){
    localStorage.setItem(k, JSON.stringify(v));
  }

  let tab = "TASK";
  const filters = {status:"ALL", time:"ALL", search:""};
  let detailItems = [];

  const orderMapKey = "order_number_map";
  const typeMap = {
    TASK_DONE:"任务完成",
    TASK_PROFIT:"任务返利",
    DEPOSIT:"充值",
    WITHDRAW:"提现",
    TX:"交易"
  };

  function normalizeType(value){
    if(!value) return "交易";
    const key = String(value).toUpperCase();
    return typeMap[key] || value;
  }

  function formatAmount(value){
    const num = Number(value || 0);
    if(Number.isNaN(num)) return "0.00";
    return num.toFixed(2);
  }

  function formatTime(value){
    const ts = typeof value === "number" ? value : toTs(value);
    if(!ts) return "-";
    const d = new Date(ts);
    const pad = (n)=>String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function generateOrderNo(used){
    let orderNo = "";
    while(!orderNo || used.has(orderNo)){
      const stamp = String(Date.now()).slice(-8);
      const rand = String(Math.floor(Math.random() * 100)).padStart(2, "0");
      orderNo = `${stamp}${rand}`;
    }
    used.add(orderNo);
    return orderNo;
  }

  function ensureOrderNos(list, storeKey){
    const orderMap = readJSON(orderMapKey, {});
    const used = new Set(Object.values(orderMap));
    let updated = false;

    list.forEach((item, index)=>{
      const baseKey = item.id || item.code || item.txid || item.hash || item.time || item.createdAt || index;
      const mapKey = `${storeKey}:${baseKey}`;
      let orderNo = item.orderNo;

      if(!orderNo || !/^\d{10}$/.test(orderNo)){
        orderNo = orderMap[mapKey];
      }
      if(!orderNo || !/^\d{10}$/.test(orderNo)){
        orderNo = generateOrderNo(used);
        orderMap[mapKey] = orderNo;
        updated = true;
      }
      if(item.orderNo !== orderNo){
        item.orderNo = orderNo;
        updated = true;
      }
    });

    if(updated){
      writeJSON(orderMapKey, orderMap);
      writeJSON(storeKey, list);
    }

    return list;
  }

  function loadTasks(){
    const list = ensureOrderNos(readJSON("tasks", []), "tasks");
    return list.filter(t=>!t.userEmail || t.userEmail===user.email)
               .sort((a,b)=>(b.createdAtTs||0)-(a.createdAtTs||0));
  }

  function loadTx(){
    const list = ensureOrderNos(readJSON("transactions", []), "transactions");
    return list.filter(t=>!t.userEmail || t.userEmail===user.email);
  }

  function statusCN(s){
    return tr(`status.${s||'PENDING'}`, tr('status.PENDING'));
  }
  function statusClass(s){
    if(s==="PENDING") return "pending";
    if(s==="DONE") return "done";
    return "fail";
  }

  function toTs(str){
    if(!str) return null;
    const parsed = Date.parse(str.replace(/-/g, "/"));
    if(!Number.isNaN(parsed)) return parsed;
    return null;
  }

  function inTimeRange(ts){
    if(filters.time === "ALL") return true;
    if(!ts) return true;
    const days = Number(filters.time || 0);
    if(!days) return true;
    return (Date.now() - ts) <= days * 86400000;
  }

  function matchStatus(item){
    if(filters.status === "ALL") return true;
    if(tab === "TASK"){
      if(filters.status === "FAILED") return item.status === "REJECTED";
      return item.status === filters.status;
    }
    if(filters.status === "DONE") return item.status === "SUCCESS";
    if(filters.status === "FAILED") return item.status === "FAILED";
    return item.status === "PENDING";
  }

  function matchSearch(item){
    const q = (filters.search || "").trim().toLowerCase();
    if(!q) return true;
    const pool = [item.orderNo, item.code, item.id, item.note, item.title].filter(Boolean).join(" ").toLowerCase();
    return pool.includes(q);
  }

  function renderNotice(){
    const box = $("notice");
    const taskId = localStorage.getItem("need_recharge_task");
    const amt = localStorage.getItem("need_recharge_amount");

    if(!taskId) { box.innerHTML = ""; return; }

    box.innerHTML = `
      <div class="notice">
        <div class="nTop">
          <div class="nTitle">${tr('insufficientTitle')}</div>
        </div>
        <div class="nSub">
          ${tr('insufficientBody')(amt)}
        </div>
        <div class="nBtns">
          <button class="nBtn ghost" id="goDeposit">${tr('goDeposit')}</button>
          <button class="nBtn" id="goTask">${tr('goTask')}</button>
        </div>
      </div>
    `;

    document.getElementById("goDeposit").onclick = ()=> window.location.href = "./deposit.html";
    document.getElementById("goTask").onclick = ()=>{
      // 不清标记也行（任务页会自动打开），但为了干净我们先清
      window.location.href = "./tasks.html?open=" + encodeURIComponent(taskId);
    };

    // 自动切到流水，方便用户看充值/提现记录
    tab = "TX";
    Array.from(document.querySelectorAll(".seg")).forEach(x=>x.classList.remove("active"));
    document.querySelector('.seg[data-tab="TX"]').classList.add("active");
  }

  function render(){
    const listEl = $("list");
    const empty = $("empty");
    detailItems = [];

    if(tab==="TASK"){
      const tasks = loadTasks()
        .filter(t=>matchStatus(t))
        .filter(t=>matchSearch(t))
        .filter(t=>inTimeRange(t.createdAtTs || toTs(t.createdAt)));
      if(tasks.length===0){
        listEl.innerHTML = "";
        empty.style.display="block";
        return;
      }
      empty.style.display="none";

      listEl.innerHTML = tasks.map(t=>{
        const tag = statusCN(t.status||"PENDING");
        const cls = statusClass(t.status||"PENDING");
        const displayType = normalizeType(t.type || t.title || "TASK_DONE");
        const displayAmount = formatAmount(t.amount);
        const displayTime = formatTime(t.createdAtTs || t.createdAt);
        const reward = Number(t.amount||0) * Number(t.rewardRate||5) / 100;
        const detailIndex = detailItems.length;
        detailItems.push({
          title:"任务回执",
          sub:"记录已生成，可在记录中心查询。",
          rows:[
            {k:"订单编号", v:t.orderNo || "-"},
            {k:"记录类型", v:displayType},
            {k:"提交时间", v:displayTime},
            {k:"订单金额", v:`${displayAmount} USDT`, highlight:true},
            {k:"返利金额", v:`${formatAmount(reward)} USDT`, highlight:true},
            {k:"处理状态", v:tag}
          ]
        });
        return `
          <div class="rCard">
            <div class="rowTop">
              <div class="rowType">${displayType}</div>
              <div class="rowAmount"><strong>${displayAmount}</strong> USDT</div>
            </div>
            <div class="rowBottom">
              <div class="rowMeta">
                <span class="rowOrder">订单号：${t.orderNo || "-"}</span>
                <span class="rowTime">${displayTime}</span>
              </div>
              <span class="rowTag ${cls}">${tag}</span>
            </div>
            <div class="ledgerActions">
              ${ (t.status==="PENDING") ? `<button class="rBtn" data-go="${t.id}">${tr('continue')}</button>` : `<button class="rBtn ghost" data-go="tx">${tr('viewTx')}</button>` }
              <button class="rBtn ghost" data-detail="${detailIndex}">查看回执</button>
            </div>
          </div>
        `;
      }).join("");

      Array.from(document.querySelectorAll("[data-go]")).forEach(btn=>{
        btn.onclick = ()=>{
          const v = btn.getAttribute("data-go");
          if(v==="tx"){
            tab="TX";
            Array.from(document.querySelectorAll(".seg")).forEach(x=>x.classList.remove("active"));
            document.querySelector('.seg[data-tab="TX"]').classList.add("active");
            render();
            return;
          }
          window.location.href = "./task-do.html?tid=" + encodeURIComponent(v);
        };
      });

      return;
    }

    // TX
    const tx = loadTx()
      .filter(t=>matchStatus(t))
      .filter(t=>matchSearch(t))
      .filter(t=>inTimeRange(toTs(t.time)));
    if(tx.length===0){
      listEl.innerHTML = "";
      empty.style.display="block";
      return;
    }
    empty.style.display="none";

    listEl.innerHTML = tx.map(t=>{
      const typ = t.type || "TX";
      const st = t.status || "PENDING";
      const tag = tr(`txStatus.${st}`, tr('txStatus.PENDING'));
      const cls = (st==="SUCCESS"?"done":(st==="FAILED"?"fail":"pending"));
      const rebate = (typ && String(typ).includes("TASK")) ? formatAmount(t.amount) : "-";
      const displayType = normalizeType(typ);
      const displayAmount = formatAmount(t.amount);
      const displayTime = formatTime(t.time);
      const detailIndex = detailItems.length;
      detailItems.push({
        title:"交易回执",
        sub:"记录已生成，可在记录中心查询。",
        rows:[
          {k:"订单编号", v:t.orderNo || "-"},
          {k:"交易类型", v:displayType},
          {k:"交易时间", v:displayTime},
          {k:"金额", v:`${displayAmount} ${t.chain || "USDT"}`, highlight:true},
          {k:"返利金额", v:rebate === "-" ? "-" : `${rebate} USDT`, highlight:rebate !== "-"},
          {k:"处理状态", v:tag},
          {k:"说明", v:t.note || "-"}
        ]
      });
      return `
        <div class="rCard">
          <div class="rowTop">
            <div class="rowType">${displayType}</div>
            <div class="rowAmount"><strong>${displayAmount}</strong> ${t.chain || "USDT"}</div>
          </div>
          <div class="rowBottom">
            <div class="rowMeta">
              <span class="rowOrder">订单号：${t.orderNo || "-"}</span>
              <span class="rowTime">${displayTime}</span>
            </div>
            <span class="rowTag ${cls}">${tag}</span>
          </div>
          <div class="ledgerActions">
            <button class="rBtn ghost" data-detail="${detailIndex}">查看回执</button>
            <button class="rBtn ghost" onclick="window.location.href='./transactions.html'">${tr('txDetail')}</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function showSkeleton(){
    const skeleton = $("skeleton");
    if(skeleton) skeleton.style.display = "block";
    $("list").style.display = "none";
    $("empty").style.display = "none";
  }

  function hideSkeleton(){
    const skeleton = $("skeleton");
    if(skeleton) skeleton.style.display = "none";
    $("list").style.display = "";
  }

  function renderWithSkeleton(){
    showSkeleton();
    setTimeout(()=>{
      hideSkeleton();
      render();
      bindDetailActions();
    }, 320);
  }

  function bindDetailActions(){
    Array.from(document.querySelectorAll("[data-detail]")).forEach(btn=>{
      btn.onclick = ()=>{
        const idx = Number(btn.getAttribute("data-detail"));
        const detail = detailItems[idx];
        if(!detail) return;
        $("detailSub").innerText = detail.sub || "";
        $("detailBill").innerHTML = detail.rows.map(row=>{
          const cls = row.highlight ? "keyNum" : "";
          return `<div class="billRow"><span>${row.k}</span><b class="${cls}">${row.v}</b></div>`;
        }).join("");
        $("detailMask").classList.add("show");
      };
    });
  }

  // seg
  Array.from(document.querySelectorAll(".seg")).forEach(b=>{
    b.onclick = ()=>{
      Array.from(document.querySelectorAll(".seg")).forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      tab = b.getAttribute("data-tab") || "TASK";
      renderWithSkeleton();
    };
  });

  if(window.Lang) Lang.bindToggle($("langBtn"));

  renderNotice();
  renderWithSkeleton();

  $("detailClose").addEventListener("click", ()=>{
    $("detailMask").classList.remove("show");
  });

  $("statusFilter").addEventListener("change", (e)=>{
    filters.status = e.target.value;
    renderWithSkeleton();
  });
  $("timeFilter").addEventListener("change", (e)=>{
    filters.time = e.target.value;
    renderWithSkeleton();
  });
  $("orderSearch").addEventListener("input", (e)=>{
    filters.search = e.target.value;
    renderWithSkeleton();
  });
  $("searchBtn").addEventListener("click", ()=>{
    filters.search = $("orderSearch").value;
    renderWithSkeleton();
  });

  if(window.Lang){
    Lang.apply();
    document.addEventListener('lang:change', ()=>{
      renderNotice();
      renderWithSkeleton();
      Lang.apply();
    });
  }
})();
