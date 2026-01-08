(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: 'IP 查询', activeKey: 'ip-lookup' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">IP 查询</div>
      <div id="ipStatus" class="admin-alert info">输入 IP 后查询登录记录。</div>
      <div class="admin-form-row">
        <input class="admin-input" id="lookupIp" placeholder="例如 1.2.3.4" />
        <button class="admin-button" id="lookupBtn">查询</button>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-title">IP 概览</div>
      <div id="ipSummary" class="admin-muted">暂无数据</div>
    </div>
    <div class="admin-card">
      <div class="admin-card-title">关联账号</div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>登录次数</th>
            <th>最近登录时间</th>
          </tr>
        </thead>
        <tbody id="ipUserBody"></tbody>
      </table>
    </div>
  `;

  const statusEl = document.getElementById('ipStatus');
  const summaryEl = document.getElementById('ipSummary');
  const bodyEl = document.getElementById('ipUserBody');
  const lookupBtn = document.getElementById('lookupBtn');

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `admin-alert ${type}`;
  }

  function renderUsers(users) {
    if (!users.length) {
      bodyEl.innerHTML = '<tr><td colspan="3" class="admin-muted">暂无记录</td></tr>';
      return;
    }

    bodyEl.innerHTML = users
      .map(
        (row) => `
        <tr>
          <td>${row.username}</td>
          <td>${row.count}</td>
          <td>${row.last_login || '-'}</td>
        </tr>
      `
      )
      .join('');
  }

  async function lookupIp() {
    const ip = document.getElementById('lookupIp').value.trim();
    if (!ip) {
      setStatus('请输入 IP。', 'error');
      return;
    }

    setStatus('查询中...', 'info');
    try {
      const data = await window.adminAuth.apiFetch(`/api/admin/ip-lookup?ip=${encodeURIComponent(ip)}`);
      summaryEl.textContent = `IP: ${data.ip}，登录次数：${data.total}，最近登录：${data.last_login || '-'}。`;
      renderUsers(Array.isArray(data.users) ? data.users : []);
      setStatus('查询完成。', 'success');
    } catch (err) {
      summaryEl.textContent = '暂无数据';
      bodyEl.innerHTML = '<tr><td colspan="3" class="admin-muted">查询失败</td></tr>';
      setStatus(err.message || '查询失败', 'error');
    }
  }

  lookupBtn.addEventListener('click', lookupIp);
})();
