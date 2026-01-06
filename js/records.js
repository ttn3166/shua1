(function(){
  const user = requireAuth();
  if(!user) return;

  const $ = (id)=>document.getElementById(id);

  const dict = {
    zh:{
      status:{PENDING:'待处理', DONE:'已完成', REJECTED:'已拒绝'},
      txStatus:{SUCCESS:'成功', FAILED:'失败', PENDING:'待处理'},
      insufficientTitle:'余额不足',
      insufficientBody:(amt)=>`当前任务需要可用余额 ≥ <b>${amt || '0.0000'}</b>（USDT）。请先充值或完成资金准备，然后继续任务。`,
      goDeposit:'去充值', goTask:'返回任务',
      segTask:'任务记录', segTx:'交易流水',
      amount:'金额', progress:'进度', currency:'币种',
      continue:'继续', viewTx:'查看流水',
      txDetail:'交易明细'
    },
    en:{
      status:{PENDING:'Pending', DONE:'Completed', REJECTED:'Rejected'},
      txStatus:{SUCCESS:'Success', FAILED:'Failed', PENDING:'Pending'},
      insufficientTitle:'Insufficient balance',
      insufficientBody:(amt)=>`This task requires available funds ≥ <b>${amt || '0.0000'}</b> USDT. Please top up before continuing.`,
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

  let tab = "TASK";

  function loadTasks(){
    const list = readJSON("tasks", []);
    return list.filter(t=>!t.userEmail || t.userEmail===user.email)
               .sort((a,b)=>(b.createdAtTs||0)-(a.createdAtTs||0));
  }

  function loadTx(){
    const list = readJSON("transactions", []);
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

    if(tab==="TASK"){
      const tasks = loadTasks();
      if(tasks.length===0){
        listEl.innerHTML = "";
        empty.style.display="block";
        return;
      }
      empty.style.display="none";

      listEl.innerHTML = tasks.map(t=>{
        const tag = statusCN(t.status||"PENDING");
        const cls = statusClass(t.status||"PENDING");
        return `
          <div class="rCard">
            <div class="rTop">
              <div>
                <div class="rTitle">${t.title||"任务"}</div>
                <div class="rSub">${t.createdAt||""} · 编号 ${t.code||"-"}</div>
              </div>
              <div class="rTag ${cls}">${tag}</div>
            </div>

            <div class="rGrid">
              <div class="rBox">
                <div class="rK">${tr('amount')}</div>
                <div class="rV">${Number(t.amount||0).toFixed(4)}</div>
              </div>
              <div class="rBox">
                <div class="rK">${tr('progress')}</div>
                <div class="rV blue">${Number(t.step||0)}/${Number(t.totalSteps||20)}</div>
              </div>
            </div>

            <div class="rBtnRow">
              ${ (t.status==="PENDING") ? `<button class="rBtn" data-go="${t.id}">${tr('continue')}</button>` : `<button class="rBtn ghost" data-go="tx">${tr('viewTx')}</button>` }
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
    const tx = loadTx();
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
      return `
        <div class="rCard">
          <div class="rTop">
            <div>
              <div class="rTitle">${typ} · ${t.note || ""}</div>
              <div class="rSub">${t.time || ""}</div>
            </div>
            <div class="rTag ${cls}">${tag}</div>
          </div>

          <div class="rGrid">
            <div class="rBox">
              <div class="rK">${tr('amount')}</div>
              <div class="rV blue">${Number(t.amount||0).toFixed(4)}</div>
            </div>
            <div class="rBox">
              <div class="rK">${tr('currency')}</div>
              <div class="rV">${t.chain || "USDT"}</div>
            </div>
          </div>

          <div class="rBtnRow">
            <button class="rBtn ghost" onclick="window.location.href='./transactions.html'">${tr('txDetail')}</button>
          </div>
        </div>
      `;
    }).join("");
  }

  // seg
  Array.from(document.querySelectorAll(".seg")).forEach(b=>{
    b.onclick = ()=>{
      Array.from(document.querySelectorAll(".seg")).forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      tab = b.getAttribute("data-tab") || "TASK";
      render();
    };
  });

  if(window.Lang) Lang.bindToggle($("langBtn"));

  renderNotice();
  render();

  if(window.Lang){
    Lang.apply();
    document.addEventListener('lang:change', ()=>{
      renderNotice();
      render();
      Lang.apply();
    });
  }
})();
