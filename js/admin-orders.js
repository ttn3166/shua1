(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: '订单管理', activeKey: 'orders' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">筛选</div>
      <div id="ordersStatus" class="admin-alert info">加载中...</div>
      <div class="admin-form-row">
        <input class="admin-input" id="filterOrderNo" placeholder="订单号" />
        <input class="admin-input" id="filterUserId" placeholder="用户ID" />
        <input class="admin-input" id="filterStatus" placeholder="状态" />
        <button class="admin-button secondary" id="ordersFilter">筛选</button>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-title">订单列表</div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>订单号</th>
            <th>用户ID</th>
            <th>金额</th>
            <th>状态</th>
            <th>创建时间</th>
          </tr>
        </thead>
        <tbody id="ordersBody"></tbody>
      </table>
    </div>
  `;

  const statusEl = document.getElementById('ordersStatus');
  const bodyEl = document.getElementById('ordersBody');
  const filterBtn = document.getElementById('ordersFilter');

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `admin-alert ${type}`;
  }

  function renderRows(rows) {
    if (!rows.length) {
      bodyEl.innerHTML = '<tr><td colspan="6" class="admin-muted">暂无记录</td></tr>';
      return;
    }
    bodyEl.innerHTML = rows
      .map(
        (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${row.order_no}</td>
          <td>${row.user_id}</td>
          <td>${row.amount}</td>
          <td>${row.status}</td>
          <td>${row.created_at || '-'}</td>
        </tr>
      `
      )
      .join('');
  }

  async function loadOrders() {
    const orderNo = document.getElementById('filterOrderNo').value.trim();
    const userId = document.getElementById('filterUserId').value.trim();
    const status = document.getElementById('filterStatus').value.trim();
    const params = new URLSearchParams();
    if (orderNo) params.set('order_no', orderNo);
    if (userId) params.set('user_id', userId);
    if (status) params.set('status', status);

    setStatus('加载中...', 'info');
    try {
      const data = await window.adminAuth.apiFetch(`/api/orders?${params.toString()}`);
      renderRows(Array.isArray(data) ? data : []);
      setStatus('加载完成。', 'success');
    } catch (err) {
      bodyEl.innerHTML = '<tr><td colspan="6" class="admin-muted">加载失败</td></tr>';
      setStatus(err.message || '加载失败', 'error');
    }
  }

  filterBtn.addEventListener('click', loadOrders);

  loadOrders();
})();
