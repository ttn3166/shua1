(function () {
  const auth = window.adminAuth;
  const user = auth ? auth.requireAuth() : null;
  if (!user) return;

  const $ = (id) => document.getElementById(id);
  const listEl = $('list');
  const adminUser = $('adminUser');
  const logoutBtn = $('logoutBtn');
  const backBtn = $('backBtn');

  adminUser.textContent = `${user.username || '管理员'} (${user.role || '-'})`;

  let active = 'DEP';

  function formatTime(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderEmpty(text) {
    listEl.innerHTML = `<div class="item"><div class="t">${esc(text)}</div><div class="m">暂无待处理记录。</div></div>`;
  }

  async function loadData() {
    if (active === 'DEP') {
      const data = await auth.apiFetch('/api/finance/deposits');
      const pending = (data || []).filter((item) => item.status === 'pending');
      renderDeposits(pending);
    } else {
      const data = await auth.apiFetch('/api/finance/withdrawals');
      const pending = (data || []).filter((item) => ['pending', 'approved'].includes(item.status));
      renderWithdrawals(pending);
    }
  }

  function renderDeposits(items) {
    if (!items.length) {
      renderEmpty('暂无待处理充值');
      return;
    }
    listEl.innerHTML = items.map((item) => {
      return `
        <div class="item">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
            <div class="t">充值申请 #${item.id}</div>
            <span class="badge">${item.status}</span>
          </div>
          <div class="noteLine">
            金额：${Number(item.amount || 0).toFixed(2)}<br>
            用户ID：${item.user_id}<br>
            备注：${esc(item.note || '-')}
          </div>
          <div class="noteLine">提交时间：${formatTime(item.created_at)}</div>
          <div class="ctrlRow">
            <input class="smallInput" id="dep_reason_${item.id}" placeholder="审核原因(必填)" />
            <button class="btn btnPrimary" data-act="dep_ok" data-id="${item.id}">通过</button>
            <button class="btn btnDanger" data-act="dep_no" data-id="${item.id}">拒绝</button>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('button[data-act]').forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const act = btn.getAttribute('data-act');
        const reason = document.getElementById(`dep_reason_${id}`).value.trim();
        if (!reason) {
          alert('必须填写原因');
          return;
        }
        const endpoint = act === 'dep_ok' ? `/api/finance/deposits/${id}/approve` : `/api/finance/deposits/${id}/reject`;
        await auth.apiFetch(endpoint, {
          method: 'POST',
          body: JSON.stringify({ reason })
        });
        await loadData();
      };
    });
  }

  function renderWithdrawals(items) {
    if (!items.length) {
      renderEmpty('暂无待处理提现');
      return;
    }
    listEl.innerHTML = items.map((item) => {
      return `
        <div class="item">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
            <div class="t">提现申请 #${item.id}</div>
            <span class="badge">${item.status}</span>
          </div>
          <div class="noteLine">
            金额：${Number(item.amount || 0).toFixed(2)}<br>
            用户ID：${item.user_id}<br>
            备注：${esc(item.note || '-')}
          </div>
          <div class="noteLine">提交时间：${formatTime(item.created_at)}</div>
          <div class="ctrlRow">
            <input class="smallInput" id="wd_reason_${item.id}" placeholder="审核原因(必填)" />
            <button class="btn btnPrimary" data-act="wd_ok" data-id="${item.id}">通过</button>
            <button class="btn btnDanger" data-act="wd_no" data-id="${item.id}">拒绝</button>
          </div>
          <div class="ctrlRow">
            <input class="smallInput" id="wd_ref_${item.id}" placeholder="打款凭证号(已打款时必填)" />
            <button class="btn" data-act="wd_paid" data-id="${item.id}">已打款</button>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('button[data-act]').forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const act = btn.getAttribute('data-act');
        const reason = document.getElementById(`wd_reason_${id}`).value.trim();
        if (!reason) {
          alert('必须填写原因');
          return;
        }
        if (act === 'wd_paid') {
          const payoutRef = document.getElementById(`wd_ref_${id}`).value.trim();
          if (!payoutRef) {
            alert('已打款需要填写凭证号');
            return;
          }
          await auth.apiFetch(`/api/finance/withdrawals/${id}/paid`, {
            method: 'POST',
            body: JSON.stringify({ payout_ref: payoutRef, reason })
          });
        } else {
          const endpoint = act === 'wd_ok' ? `/api/finance/withdrawals/${id}/approve` : `/api/finance/withdrawals/${id}/reject`;
          await auth.apiFetch(endpoint, {
            method: 'POST',
            body: JSON.stringify({ reason })
          });
        }
        await loadData();
      };
    });
  }

  $('tabDep').onclick = () => {
    active = 'DEP';
    $('tabDep').classList.add('active');
    $('tabWd').classList.remove('active');
    loadData();
  };

  $('tabWd').onclick = () => {
    active = 'WD';
    $('tabWd').classList.add('active');
    $('tabDep').classList.remove('active');
    loadData();
  };

  logoutBtn.onclick = () => {
    auth.clearSession();
    window.location.href = './admin-login.html';
  };

  backBtn.onclick = () => history.back();

  loadData().catch((error) => {
    listEl.innerHTML = `<div class="item"><div class="t">加载失败</div><div class="m">${esc(error.message || '请检查登录状态')}</div></div>`;
  });
})();
