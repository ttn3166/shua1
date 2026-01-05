(function(){
  function $(id){ return document.getElementById(id); }

  function load(){
    try{ return JSON.parse(localStorage.getItem("lottery_logs") || "[]"); }catch(e){ return []; }
  }
  function save(arr){
    localStorage.setItem("lottery_logs", JSON.stringify(arr));
  }

  function render(){
    const arr = load().slice().reverse();
    const box = $("list");
    if(arr.length===0){
      box.innerHTML = '<div class="small">暂无记录</div>';
      return;
    }
    box.innerHTML = arr.map(it=>`
      <div class="item">
        <div class="l">
          <div class="t">${it.result}</div>
          <div class="s">消耗 ${Number(it.cost).toFixed(4)} USDT</div>
          <div class="s">${it.time}</div>
        </div>
        <div class="r"><span class="status succ">已完成</span></div>
      </div>
    `).join("");
  }

  function drawOnce(){
    const pool = [
      "获得奖励：0.2000 USDT",
      "获得奖励：0.1000 USDT",
      "获得奖励：0.0500 USDT",
      "未中奖",
      "未中奖",
      "未中奖"
    ];
    return pool[Math.floor(Math.random()*pool.length)];
  }

  document.addEventListener("DOMContentLoaded", function(){
    const user = requireAuth();
    if(!user) return;

    $("backBtn").onclick = ()=> window.location.href="./me.html";

    $("drawBtn").onclick = ()=>{
      const btn = $("drawBtn");
      btn.disabled = true;
      btn.innerText = "抽奖中...";

      setTimeout(()=>{
        const result = drawOnce();
        const arr = load();
        arr.push({ result, cost: 1.0, time:new Date().toLocaleString() });
        save(arr);
        $("tip").innerText = "已完成：" + result;
        btn.disabled = false;
        btn.innerText = "开始抽奖";
        render();
      }, 700);
    };

    render();
  });
})();
