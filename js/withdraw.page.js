(function(){
  function $(id){ return document.getElementById(id); }

  function load(){
    try{ return JSON.parse(localStorage.getItem("withdrawals") || "[]"); }catch(e){ return []; }
  }
  function save(arr){
    localStorage.setItem("withdrawals", JSON.stringify(arr));
  }

  function render(){
    const arr = load().slice().reverse();
    const box = $("list");
    if(arr.length === 0){
      box.innerHTML = '<div class="small">暂无记录</div>';
      return;
    }
    box.innerHTML = arr.map(it=>{
      const st = it.status || "PENDING";
      const cls = st==="SUCCESS"?"succ":(st==="FAILED"?"fail":"pend");
      const txt = st==="SUCCESS"?"成功":(st==="FAILED"?"失败":"待处理");
      return `
        <div class="item">
          <div class="l">
            <div class="t">${it.chain} 提现 ${Number(it.amount).toFixed(4)} USDT</div>
            <div class="s">${it.addr}</div>
            <div class="s">${it.time}</div>
          </div>
          <div class="r"><span class="status ${cls}">${txt}</span></div>
        </div>
      `;
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", function(){
    const user = requireAuth();
    if(!user) return;

    $("backBtn").onclick = ()=> window.location.href = "./me.html";

    $("applyBtn").onclick = ()=>{
      const chain = $("chain").value;
      const addr = $("addr").value.trim();
      const amount = parseFloat($("amt").value);
      if(!addr) return alert("请输入提现地址");
      if(!amount || amount<=0) return alert("请输入正确金额");

      const arr = load();
      arr.push({ chain, addr, amount, status:"PENDING", time:new Date().toLocaleString() });
      save(arr);

      $("addr").value = "";
      $("amt").value = "";
      $("tip").innerText = "已提交申请，等待处理。";
      render();
    };

    render();
  });
})();
