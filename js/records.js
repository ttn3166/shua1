(function(){
  const user = requireAuth();
  if(!user) return;

  const $ = (id)=>document.getElementById(id);

  let tab = "TASK";
  const filters = {status:"ALL", time:"ALL", search:""};

  function formatTime(value){
    if(!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const pad = (n)=>String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function inTimeRange(value){
    if(filters.time === "ALL") return true;
    const days = Number(filters.time || 0);
    if(!days) return true;
    const ts = new Date(value).getTime();
    if (Number.isNaN(ts)) return true;
    return (Date.now() - ts) <= days * 86400000;
  }

  function matchStatus(item){
    if(filters.status === "ALL") return true;
    if(tab === "TASK") {
      if(filters.status === "PENDING") return item.status === 'pending';
      if(filters.status === "DONE") return item.status === 'completed';
      if(filters.status === "FAILED") return item.status === 'cancelled';
      return true;
    }
    if(filters.status === "PENDING") return item.status === 'pending';
    if(filters.status === "DONE") return item.status !== 'failed';
    if(filters.status === "FAILED") return item.status === 'failed';
    return true;
  }

  function matchSearch(item){
    const q = (filters.search || "").trim();
    if(!q) return true;
    const pool = [item.order_no, item.id, item.template_name].filter(Boolean).join(" ");
    return pool.includes(q);
  }

  function renderList(rows){
    const list = $("list");
    const empty = $("empty");
    if(!rows.length){
      list.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    list.innerHTML = rows.map((row)=>{
      if(tab === "TASK"){
        return `
          <div class="recordCard">
            <div class="rTop">
              <div class="rType">任务</div>
              <div class="rBadge">${row.status}</div>
            </div>
            <div class="rMid">任务：${row.template_name || '-'}<br>订单数：${row.order_count}<br>创建时间：${formatTime(row.created_at)}</div>
            <div class="rAmt">#${row.id}</div>
          </div>
        `;
      }
      const amt = Number(row.amount || 0);
      const sign = amt >= 0 ? '+' : '';
      return `
        <div class="recordCard">
          <div class="rTop">
            <div class="rType">流水</div>
            <div class="rBadge">${row.type}</div>
          </div>
          <div class="rMid">订单号：${row.order_no || '-'}<br>原因：${row.reason || '-'}<br>时间：${formatTime(row.created_at)}</div>
          <div class="rAmt">${sign}${amt.toFixed(4)} USDT</div>
        </div>
      `;
    }).join("");
  }

  async function loadData(){
    $("skeleton").style.display = 'block';
    try {
      const [tasks, ledger] = await Promise.all([
        publicApiFetch('/api/public/tasks'),
        publicApiFetch('/api/public/ledger')
      ]);

      const taskRows = (Array.isArray(tasks) ? tasks : [])
        .filter(row => inTimeRange(row.created_at) && matchStatus(row) && matchSearch(row));
      const ledgerRows = (Array.isArray(ledger) ? ledger : [])
        .filter(row => inTimeRange(row.created_at) && matchStatus(row) && matchSearch(row));

      const rows = tab === "TASK" ? taskRows : ledgerRows;
      renderList(rows);
    } catch (err) {
      $("list").innerHTML = '';
      $("empty").style.display = 'block';
    } finally {
      $("skeleton").style.display = 'none';
    }
  }

  document.querySelectorAll('.seg').forEach(btn=>{
    btn.onclick = ()=>{
      document.querySelectorAll('.seg').forEach(el=>el.classList.remove('active'));
      btn.classList.add('active');
      tab = btn.getAttribute('data-tab');
      loadData();
    };
  });

  $("statusFilter").onchange = (e)=>{
    filters.status = e.target.value;
    loadData();
  };
  $("timeFilter").onchange = (e)=>{
    filters.time = e.target.value;
    loadData();
  };
  $("searchBtn").onclick = ()=>{
    filters.search = $("orderSearch").value.trim();
    loadData();
  };

  loadData();
})();
