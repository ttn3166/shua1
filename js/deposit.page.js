(function(){
  function $(id){ return document.getElementById(id); }

  function loadDeposits(){
    try{ return JSON.parse(localStorage.getItem("deposits") || "[]"); }catch(e){ return []; }
  }
  function saveDeposits(arr){
    localStorage.setItem("deposits", JSON.stringify(arr));
  }

  function getAddressByChain(chain){
    // 你以后接后端接口时，把这里替换成 fetch 即可
    const map = {
      "TRC20":"Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "ERC20":"0x0000000000000000000000000000000000000000",
      "BEP20":"0x0000000000000000000000000000000000000000"
    };
    return map[chain] || "-";
  }

  function render(){
    const arr = loadDeposits().slice().reverse();
    const box = $("list");
    if(arr.length === 0){
      box.innerHTML = '<div class="small">暂无记录</div>';
      return;
    }
    box.innerHTML = arr.map(it=>{
      return `
        <div class="item">
          <div class="l">
            <div class="t">${it.chain} 充值</div>
            <div class="s">${it.note || "-"}</div>
            <div class="s">${it.time}</div>
          </div>
          <div class="r"><span class="status pend">待处理</span></div>
        </div>
      `;
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", function(){
    const user = requireAuth();
    if(!user) return;

    $("backBtn").onclick = ()=> window.location.href = "./me.html";

    function syncAddr(){
      const chain = $("chain").value;
      $("addr").value = getAddressByChain(chain);
    }
    $("chain").onchange = syncAddr;
    syncAddr();

    $("copyBtn").onclick = async ()=>{
      const v = $("addr").value.trim();
      if(!v || v === "-"){ alert("地址未配置"); return; }
      try{ await navigator.clipboard.writeText(v); alert("已复制"); }
      catch(e){ alert("复制失败，请手动复制"); }
    };

    $("submitBtn").onclick = ()=>{
      const chain = $("chain").value;
      const note = $("txhash").value.trim();
      if(!note){ alert("请填写 TxHash 或备注"); return; }
      const arr = loadDeposits();
      arr.push({ chain, note, time: new Date().toLocaleString() });
      saveDeposits(arr);
      $("txhash").value = "";
      $("tip").innerText = "已提交，等待处理。";
      render();
    };

    render();
  });
})();
