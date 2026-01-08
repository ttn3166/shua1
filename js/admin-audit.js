(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: '审计日志', activeKey: 'audit' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">审计日志</div>
      <div id="auditStatus" class="admin-alert info">加载中...</div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>操作人</th>
            <th>动作</th>
            <th>实体类型</th>
            <th>实体ID</th>
            <th>原因</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody id="auditBody"></tbody>
      </table>
    </div>
  `;

  const statusEl = document.getElementById('auditStatus');
  const bodyEl = document.getElementById('auditBody');

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `admin-alert ${type}`;
  }

  function renderRows(rows) {
    if (!rows.length) {
      bodyEl.innerHTML = '<tr><td colspan="7" class="admin-muted">暂无记录</td></tr>';
      return;
    }
    bodyEl.innerHTML = rows
      .map(
        (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${row.actor_id || '-'}</td>
          <td>${row.action}</td>
          <td>${row.entity_type || '-'}</td>
          <td>${row.entity_id || '-'}</td>
          <td>${row.reason || '-'}</td>
          <td>${row.created_at || '-'}</td>
        </tr>
      `
      )
      .join('');
  }

  async function loadAudit() {
    setStatus('加载中...', 'info');
    try {
      const data = await window.adminAuth.apiFetch('/api/audit');
      renderRows(Array.isArray(data) ? data : []);
      setStatus('加载完成。', 'success');
    } catch (err) {
      bodyEl.innerHTML = '<tr><td colspan="7" class="admin-muted">加载失败</td></tr>';
      setStatus(err.message || '加载失败', 'error');
    }
  }

  loadAudit();
})();
