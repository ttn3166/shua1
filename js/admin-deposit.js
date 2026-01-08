(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: '充值审核', activeKey: 'deposit' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">筛选</div>
      <div class="admin-form-row">
        <select class="admin-select" id="filterStatus">
          <option value="">全部状态</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
        </select>
        <input class="admin-input" id="filterUserId" placeholder="用户ID" />
        <input class="admin-input" id="filterKeyword" placeholder="备注关键词" />
        <input class="admin-input" id="filterStart" type="date" />
        <input class="admin-input" id="filterEnd" type="date" />
        <button class="admin-button secondary" id="filterSubmit">筛选</button>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-title">充值审核</div>
      <div id="depositStatus" class="admin-alert info">加载中...</div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户ID</th>
              <th>金额</th>
              <th>状态</th>
              <th>备注</th>
              <th>附件</th>
              <th>提交时间</th>
              <th>审核人</th>
              <th>审核时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="depositBody"></tbody>
        </table>
      </div>
    </div>
  `;

  const statusEl = document.getElementById('depositStatus');
  const bodyEl = document.getElementById('depositBody');
  const filterBtn = document.getElementById('filterSubmit');
  let deposits = [];

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `admin-alert ${type}`;
  }

  function inRange(dateValue, start, end) {
    if (!dateValue) return true;
    const ts = new Date(dateValue).getTime();
    if (Number.isNaN(ts)) return true;
    if (start) {
      const startTs = new Date(start).getTime();
      if (ts < startTs) return false;
    }
    if (end) {
      const endTs = new Date(end).getTime() + 86400000 - 1;
      if (ts > endTs) return false;
    }
    return true;
  }

  function renderRows(rows) {
    if (!rows.length) {
      bodyEl.innerHTML = '<tr><td colspan="10" class="admin-muted">暂无记录</td></tr>';
      setStatus('暂无待处理充值。', 'info');
      return;
    }

    bodyEl.innerHTML = rows
      .map(
        (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${row.user_id}</td>
          <td>${row.amount}</td>
          <td>${row.status}</td>
          <td>${row.note || '-'}</td>
          <td>${row.attachment_url ? `<a href="${row.attachment_url}" target="_blank">查看</a>` : '-'}</td>
          <td>${row.created_at || '-'}</td>
          <td>${row.reviewed_by || '-'}</td>
          <td>${row.reviewed_at || '-'}</td>
          <td>
            <div class="admin-actions">
              <button class="admin-button" data-action="approve" data-id="${row.id}">通过</button>
              <button class="admin-button secondary" data-action="reject" data-id="${row.id}">拒绝</button>
            </div>
          </td>
        </tr>
      `
      )
      .join('');
    setStatus('加载成功。', 'success');
  }

  function applyFilters() {
    const status = document.getElementById('filterStatus').value.trim();
    const userId = document.getElementById('filterUserId').value.trim();
    const keyword = document.getElementById('filterKeyword').value.trim();
    const start = document.getElementById('filterStart').value;
    const end = document.getElementById('filterEnd').value;

    const filtered = deposits.filter((row) => {
      if (status && row.status !== status) return false;
      if (userId && String(row.user_id) !== userId) return false;
      if (keyword && !(row.note || '').includes(keyword)) return false;
      if (!inRange(row.created_at, start, end)) return false;
      return true;
    });
    renderRows(filtered);
  }

  async function loadDeposits() {
    setStatus('加载中...', 'info');
    try {
      const data = await window.adminAuth.apiFetch('/api/finance/deposits');
      deposits = Array.isArray(data) ? data : [];
      applyFilters();
    } catch (err) {
      bodyEl.innerHTML = '<tr><td colspan="10" class="admin-muted">加载失败</td></tr>';
      setStatus(err.message || '加载失败', 'error');
    }
  }

  async function handleAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = button.getAttribute('data-id');
    const action = button.getAttribute('data-action');
    const reason = window.prompt('请输入操作原因：');

    if (!reason) {
      setStatus('请输入操作原因。', 'error');
      return;
    }

    try {
      await window.adminAuth.apiFetch(`/api/finance/deposits/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      setStatus('操作成功，列表已刷新。', 'success');
      await loadDeposits();
    } catch (err) {
      setStatus(err.message || '操作失败', 'error');
    }
  }

  filterBtn.addEventListener('click', applyFilters);
  bodyEl.addEventListener('click', handleAction);

  loadDeposits();
})();
