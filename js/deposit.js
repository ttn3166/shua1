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
    if (status === 'approved') return { text: '成功', cls: 'ok' };
    if (status === 'rejected') return { text: '失败', cls: 'no' };
    return { text: '待处理', cls: '' };
  }

  function render(list){
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
            <div class="rType">充值</div>
            <div class="rBadge ${st.cls}">${st.text}</div>
          </div>
          <div class="rMid">时间：${fmt(x.created_at)}<br>金额：${Number(x.amount||0).toFixed(4)}<br>备注：${x.note || '-'}<br>凭证：${x.attachment_url ? '已上传' : '-'}</div>
          <div class="rAmt">+${Number(x.amount||0).toFixed(4)} USDT</div>
        </div>
      `;
    }).join("");
  }

  async function loadDeposits(){
    try {
      const data = await publicApiFetch('/api/public/deposits');
      render(Array.isArray(data) ? data : []);
    } catch (err) {
      setMsg(err.message || '加载失败', false);
    }
  }

  const submitBtn = $("submitBtn");
  submitBtn.onclick = async function(){
    const amount = Number(($("amount").value || "").trim());
    const chain = ($("chain").value || "TRC20").trim();
    const txHash = ($("txHash").value || "").trim();

    if (!amount || amount <= 0) return setMsg("请输入正确的充值金额", false);
    if (!txHash) return setMsg("请填写 TxHash 或转账凭证编号", false);

    try {
      await publicApiFetch('/api/finance/deposits', {
        method: 'POST',
        body: JSON.stringify({ amount, note: chain, attachment_url: txHash })
      });
      $("amount").value = "";
      $("txHash").value = "";
      setMsg("充值申请已提交，等待审核入账。", true);
      await loadDeposits();
      if (window.refreshBalance) {
        await window.refreshBalance();
      }
    } catch (err) {
      setMsg(err.message || '提交失败', false);
    }
  };

  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.onclick = ()=>history.back();

  loadDeposits();
})();
