(function(){
  const user = requireAuth();
  if(!user) return;

  const $ = (id)=>document.getElementById(id);

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
    if(s==="PENDING") return "待处理";
    if(s==="DONE") return "已完成";
    if(s==="REJECTED") return "已拒绝";
    return "待处理";
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
          <div class="nTitle">余额不足</div>
        </div>
        <div class="nSub">
          当前任务需要可用余额 ≥ <b>${amt || "0.0000"}</b>（USDT）。请先充值或完成资金准备，然后继续任务。
        </div>
        <div class="nBtns">
          <button class="nBtn ghost" id="goDeposit">去充值</button>
          <button class="nBtn" id="goTask">返回任务</button>
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
                <div class="rK">金额</div>
                <div class="rV">${Number(t.amount||0).toFixed(4)}</div>
              </div>
              <div class="rBox">
                <div class="rK">进度</div>
                <div class="rV blue">${Number(t.step||0)}/${Number(t.totalSteps||20)}</div>
              </div>
            </div>

            <div class="rBtnRow">
              ${ (t.status==="PENDING") ? `<button class="rBtn" data-go="${t.id}">继续</button>` : `<button class="rBtn ghost" data-go="tx">查看流水</button>` }
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
      const tag = (st==="SUCCESS"?"成功":(st==="FAILED"?"失败":"待处理"));
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
              <div class="rK">金额</div>
              <div class="rV blue">${Number(t.amount||0).toFixed(4)}</div>
            </div>
            <div class="rBox">
              <div class="rK">币种</div>
              <div class="rV">${t.chain || "USDT"}</div>
            </div>
          </div>

          <div class="rBtnRow">
            <button class="rBtn ghost" onclick="window.location.href='./transactions.html'">交易明细</button>
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

  $("langBtn").onclick = ()=>alert("语言功能稍后接入");

  renderNotice();
  render();
})();
