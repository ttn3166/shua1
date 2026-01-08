(function(){
  const user = requireAuth();
  if (!user) return;

  const $ = (id)=>document.getElementById(id);

  function showMsg(t){
    const m=$("msg");
    m.style.display="block";
    m.innerText=t;
  }

  const COST = 1.0;
  $("cost").innerText = COST.toFixed(4);

  function render(){
    const bal = getUserBalance();
    $("bal").innerText = bal.toFixed(4);
    $("list").innerHTML = "";
    $("empty").style.display = "block";
  }

  function setLoading(on){
    const b=$("drawBtn");
    b.disabled = on;
    b.innerText = on ? "抽奖中..." : "立即抽奖";
  }

  $("backBtn").onclick = ()=>history.back();
  $("toTxBtn").onclick = ()=>window.location.href="./transactions.html";

  document.querySelectorAll("[data-go]").forEach(btn=>{
    btn.onclick = ()=>window.location.href = btn.getAttribute("data-go");
  });

  $("drawBtn").onclick = function(){
    setLoading(false);
    showMsg("抽奖功能维护中，请稍后再试。");
  };

  render();
})();
