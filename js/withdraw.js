(function(){
  const user = requireAuth();
  if (!user) return;

  const $ = (id)=>document.getElementById(id);

  function fmt(value){
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const pad=(n)=>String(n).padStart(2,"0");
    return d.getFullYear()+"/"+pad(d.getMonth()+1)+"/"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes());
  }

  function setMsg(t, ok){
    const m = $("msg");
    m.style.display="block";
    m.className = ok ? "msg ok" : "msg err";
    m.innerText = t;
  }

  function statusLabel(status){
    if (status === 'approved') return { text: '已审核', cls: 'ok' };
    if (status === 'paid') return { text: '已打款', cls: 'ok' };
    if (status === 'rejected') return { text: '已拒绝', cls: 'no' };
    return { text: '待处理', cls: '' };
  }

  async function renderTop(){
    if (window.refreshBalance) {
      await window.refreshBalance();
    }
    const bal = getUserBalance();
    const balEl = document.getElementById("bal");
    const frzEl = document.getElementById("frozen");
    if (balEl) balEl.innerText = bal.toFixed(4);
    if (frzEl) frzEl.innerText = '0.0000';
  }

  function renderList(list){
    const box = $("list");
    if (!list.length){
      box.innerHTML = "";
      $("empty").style.display="block";
      return;
    }
    $("empty").style.display="none";

    box.innerHTML = list.slice(0,20).map(x=>{
      const st = statusLabel(x.status);
      return `
        <div class="row">
          <div class="rTop">
            <div class="rType">提现</div>
            <div class="rBadge ${st.cls}">${st.text}</div>
          </div>
          <div class="rMid">时间：${fmt(x.created_at)}<br>备注：${x.note || '-'}<br>参考号：${x.payout_ref || '-'}</div>
          <div class="rAmt">-${Number(x.amount||0).toFixed(4)} USDT</div>
        </div>
      `;
    }).join("");
  }

  async function loadWithdrawals(){
    try {
      const data = await publicApiFetch('/api/public/withdrawals');
      renderList(Array.isArray(data) ? data : []);
    } catch (err) {
      setMsg(err.message || '加载失败', false);
    }
  }

  $("submitBtn").onclick = async function(){
    const addr = ($("addr").value || "").trim();
    const amount = Number(($("amount").value || "").trim());
    const chain = ($("chain").value || "TRC20").trim();

    if (!addr) return setMsg("请输入提现地址", false);
    if (!amount || amount <= 0) return setMsg("请输入正确的提现金额", false);

    const bal = getUserBalance();
    if (bal < amount) return setMsg("可用余额不足", false);

    try {
      await publicApiFetch('/api/finance/withdrawals', {
        method: 'POST',
        body: JSON.stringify({ amount, note: `${chain} ${addr}` })
      });
      $("addr").value = "";
      $("amount").value = "";
      setMsg("提现申请已提交，等待审核。", true);
      await loadWithdrawals();
      await renderTop();
    } catch (err) {
      setMsg(err.message || '提交失败', false);
    }
  };

  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.onclick = ()=>history.back();

  renderTop();
  loadWithdrawals();
})();
