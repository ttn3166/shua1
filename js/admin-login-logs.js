(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: '登录记录', activeKey: 'login-logs' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">登录记录查询</div>
      <div id="loginLogStatus" class="admin-alert info">可按 IP 或用户名查询。</div>
      <div class="admin-form-row">
        <input class="admin-input" id="filterIp" placeholder="IP 地址" />
        <input class="admin-input" id="filterUsername" placeholder="用户名" />
        <button class="admin-button" id="filterSearch">查询</button>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-title">记录列表</div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>IP</th>
            <th>User Agent</th>
            <th>登录时间</th>
          </tr>
        </thead>
        <tbody id="loginLogBody"></tbody>
      </table>
    </div>
  `;

  const statusEl = document.getElementById('loginLogStatus');
  const bodyEl = document.getElementById('loginLogBody');
  const searchBtn = document.getElementById('filterSearch');

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `admin-alert ${type}`;
  }

  function renderRows(rows) {
    if (!rows.length) {
      bodyEl.innerHTML = '<tr><td colspan="5" class="admin-muted">暂无记录</td></tr>';
      return;
    }

    bodyEl.innerHTML = rows
      .map(
        (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${row.username}</td>
          <td>${row.ip}</td>
          <td>${row.user_agent || '-'}</td>
          <td>${row.logged_at || '-'}</td>
        </tr>
      `
      )
      .join('');
  }

  async function loadLogs() {
    const ip = document.getElementById('filterIp').value.trim();
    const username = document.getElementById('filterUsername').value.trim();
    const params = new URLSearchParams();
    if (ip) params.set('ip', ip);
    if (username) params.set('username', username);

    setStatus('加载中...', 'info');
    try {
      const data = await window.adminAuth.apiFetch(`/api/admin/login-logs?${params.toString()}`);
      renderRows(Array.isArray(data) ? data : []);
      setStatus('加载完成。', 'success');
    } catch (err) {
      bodyEl.innerHTML = '<tr><td colspan="5" class="admin-muted">加载失败</td></tr>';
      setStatus(err.message || '加载失败', 'error');
    }
  }

  searchBtn.addEventListener('click', loadLogs);

  loadLogs();
})();
