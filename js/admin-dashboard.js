(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: '仪表盘', activeKey: 'dashboard' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">今日概览</div>
      <div id="dashboardStatus" class="admin-alert info">加载中...</div>
      <div class="admin-form-row" id="dashboardSummary"></div>
    </div>
    <div class="admin-card">
      <div class="admin-card-title">待处理事项</div>
      <div class="admin-form-row" id="dashboardPending"></div>
    </div>
    <div class="admin-card">
      <div class="admin-card-title">最近登录记录</div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>IP</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody id="dashboardLogBody"></tbody>
      </table>
    </div>
  `;

  const statusEl = document.getElementById('dashboardStatus');
  const summaryEl = document.getElementById('dashboardSummary');
  const pendingEl = document.getElementById('dashboardPending');
  const logBodyEl = document.getElementById('dashboardLogBody');

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `admin-alert ${type}`;
  }

  function isToday(value) {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function renderSummary({ deposits, withdrawals, orders }) {
    summaryEl.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-title">今日充值</div>
        <div class="admin-muted">${deposits.count} 笔 / ${deposits.amount}</div>
      </div>
      <div class="admin-card">
        <div class="admin-card-title">今日提现</div>
        <div class="admin-muted">${withdrawals.count} 笔 / ${withdrawals.amount}</div>
      </div>
      <div class="admin-card">
        <div class="admin-card-title">今日订单</div>
        <div class="admin-muted">${orders.count} 笔</div>
      </div>
    `;
  }

  function renderPending({ depositPending, withdrawalPending, approvalsPending }) {
    pendingEl.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-title">待审核充值</div>
        <div class="admin-muted">${depositPending} 笔</div>
      </div>
      <div class="admin-card">
        <div class="admin-card-title">待审核提现</div>
        <div class="admin-muted">${withdrawalPending} 笔</div>
      </div>
      <div class="admin-card">
        <div class="admin-card-title">待审批事项</div>
        <div class="admin-muted">${approvalsPending} 笔</div>
      </div>
    `;
  }

  function renderLoginLogs(rows) {
    if (!rows.length) {
      logBodyEl.innerHTML = '<tr><td colspan="3" class="admin-muted">暂无记录</td></tr>';
      return;
    }
    logBodyEl.innerHTML = rows
      .map(
        (row) => `
        <tr>
          <td>${row.username}</td>
          <td>${row.ip}</td>
          <td>${row.logged_at || '-'}</td>
        </tr>
      `
      )
      .join('');
  }

  async function loadDashboard() {
    setStatus('加载中...', 'info');
    try {
      const [deposits, withdrawals, orders, approvals, logs] = await Promise.all([
        window.adminAuth.apiFetch('/api/finance/deposits'),
        window.adminAuth.apiFetch('/api/finance/withdrawals'),
        window.adminAuth.apiFetch('/api/orders'),
        window.adminAuth.apiFetch('/api/approvals'),
        window.adminAuth.apiFetch('/api/admin/login-logs?limit=5')
      ]);

      const depositRows = Array.isArray(deposits) ? deposits : [];
      const withdrawRows = Array.isArray(withdrawals) ? withdrawals : [];
      const orderRows = Array.isArray(orders) ? orders : [];
      const approvalRows = Array.isArray(approvals) ? approvals : [];
      const logRows = Array.isArray(logs) ? logs : [];

      const todayDeposits = depositRows.filter((row) => isToday(row.created_at));
      const todayWithdrawals = withdrawRows.filter((row) => isToday(row.created_at));
      const todayOrders = orderRows.filter((row) => isToday(row.created_at));

      renderSummary({
        deposits: {
          count: todayDeposits.length,
          amount: todayDeposits.reduce((sum, row) => sum + Number(row.amount || 0), 0)
        },
        withdrawals: {
          count: todayWithdrawals.length,
          amount: todayWithdrawals.reduce((sum, row) => sum + Number(row.amount || 0), 0)
        },
        orders: {
          count: todayOrders.length
        }
      });

      renderPending({
        depositPending: depositRows.filter((row) => row.status === 'pending').length,
        withdrawalPending: withdrawRows.filter((row) => row.status === 'pending').length,
        approvalsPending: approvalRows.length
      });

      renderLoginLogs(logRows);
      setStatus('加载完成。', 'success');
    } catch (err) {
      setStatus(err.message || '加载失败', 'error');
      summaryEl.innerHTML = '';
      pendingEl.innerHTML = '';
      logBodyEl.innerHTML = '<tr><td colspan="3" class="admin-muted">加载失败</td></tr>';
    }
  }

  loadDashboard();
})();
