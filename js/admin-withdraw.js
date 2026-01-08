(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: '提现审核', activeKey: 'withdraw' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">筛选</div>
      <div class="admin-form-row">
        <select class="admin-select" id="filterStatus">
          <option value="">全部状态</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="paid">paid</option>
          <option value="rejected">rejected</option>
        </select>
        <input class="admin-input" id="filterUserId" placeholder="用户ID" />
        <input class="admin-input" id="filterMin" type="number" placeholder="最小金额" />
        <input class="admin-input" id="filterMax" type="number" placeholder="最大金额" />
        <button class="admin-button secondary" id="filterSubmit">筛选</button>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-title">提现审核</div>
      <div id="withdrawStatus" class="admin-alert info">加载中...</div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户ID</th>
              <th>金额</th>
              <th>状态</th>
              <th>备注</th>
              <th>打款凭证号</th>
              <th>提交时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="withdrawBody"></tbody>
        </table>
      </div>
    </div>
  `;

  const statusEl = document.getElementById('withdrawStatus');
  const bodyEl = document.getElementById('withdrawBody');
  const filterBtn = document.getElementById('filterSubmit');
  let withdrawals = [];

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `admin-alert ${type}`;
  }

  function renderRows(rows) {
    if (!rows.length) {
      bodyEl.innerHTML = '<tr><td colspan="8" class="admin-muted">暂无记录</td></tr>';
      setStatus('暂无提现记录。', 'info');
      return;
    }

    bodyEl.innerHTML = rows
      .map((row) => {
        const status = String(row.status || '').toLowerCase();
        let actionsHtml = '<span class="admin-muted">-</span>';
        if (status === 'pending') {
          actionsHtml = `
            <div class="admin-actions">
              <button class="admin-button" data-action="approve" data-id="${row.id}">通过</button>
              <button class="admin-button secondary" data-action="reject" data-id="${row.id}">拒绝</button>
            </div>
          `;
        } else if (status === 'approved') {
          actionsHtml = `
            <div class="admin-actions">
              <button class="admin-button" data-action="paid" data-id="${row.id}">已打款</button>
            </div>
          `;
        }
        return `
          <tr>
            <td>${row.id}</td>
            <td>${row.user_id}</td>
            <td>${row.amount}</td>
            <td>${row.status}</td>
            <td>${row.note || '-'}</td>
            <td>${row.payout_ref || '-'}</td>
            <td>${row.created_at || '-'}</td>
            <td>${actionsHtml}</td>
          </tr>
        `;
      })
      .join('');
    setStatus('加载成功。', 'success');
  }

  function applyFilters() {
    const status = document.getElementById('filterStatus').value.trim();
    const userId = document.getElementById('filterUserId').value.trim();
    const min = Number(document.getElementById('filterMin').value);
    const max = Number(document.getElementById('filterMax').value);

    const filtered = withdrawals.filter((row) => {
      if (status && row.status !== status) return false;
      if (userId && String(row.user_id) !== userId) return false;
      if (!Number.isNaN(min) && row.amount < min) return false;
      if (!Number.isNaN(max) && row.amount > max) return false;
      return true;
    });
    renderRows(filtered);
  }

  async function loadWithdrawals() {
    setStatus('加载中...', 'info');
    try {
      const data = await window.adminAuth.apiFetch('/api/finance/withdrawals');
      withdrawals = Array.isArray(data) ? data : [];
      applyFilters();
    } catch (err) {
      bodyEl.innerHTML = '<tr><td colspan="8" class="admin-muted">加载失败</td></tr>';
      setStatus(err.message || '加载失败', 'error');
    }
  }

  async function handleAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = button.getAttribute('data-id');
    const action = button.getAttribute('data-action');

    let payload = {};
    if (action === 'paid') {
      const payoutRef = window.prompt('请输入打款凭证号 payout_ref：');
      const reason = window.prompt('请输入操作原因：');
      if (!payoutRef || !reason) {
        setStatus('请输入 payout_ref 和原因。', 'error');
        return;
      }
      payload = { payout_ref: payoutRef, reason };
    } else {
      const reason = window.prompt('请输入操作原因：');
      if (!reason) {
        setStatus('请输入操作原因。', 'error');
        return;
      }
      payload = { reason };
    }

    try {
      const result = await window.adminAuth.apiFetch(`/api/finance/withdrawals/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (result && result.status === 'pending_approval') {
        setStatus('已提交至审批中心。', 'success');
      } else {
        setStatus('操作成功，列表已刷新。', 'success');
      }
      await loadWithdrawals();
    } catch (err) {
      setStatus(err.message || '操作失败', 'error');
    }
  }

  filterBtn.addEventListener('click', applyFilters);
  bodyEl.addEventListener('click', handleAction);

  loadWithdrawals();
})();
