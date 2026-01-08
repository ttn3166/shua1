(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: '订单素材库', activeKey: 'order-uploads' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">素材列表</div>
      <div id="uploadsStatus" class="admin-alert info">加载中...</div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>品牌</th>
            <th>图片</th>
            <th>数量</th>
            <th>状态</th>
            <th>备注</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="uploadsBody"></tbody>
      </table>
    </div>
  `;

  const statusEl = document.getElementById('uploadsStatus');
  const bodyEl = document.getElementById('uploadsBody');

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `admin-alert ${type}`;
  }

  function renderRows(rows) {
    if (!rows.length) {
      bodyEl.innerHTML = '<tr><td colspan="9" class="admin-muted">暂无记录</td></tr>';
      return;
    }
    bodyEl.innerHTML = rows
      .map(
        (row) => {
          const statuses = ['active', 'inactive', 'archived'];
          const options = statuses
            .map((status) => `<option value=\"${status}\" ${status === row.status ? 'selected' : ''}>${status}</option>`)
            .join('');
          return `
        <tr>
          <td>${row.id}</td>
          <td>${row.title}</td>
          <td>${row.brand}</td>
          <td>${row.image_url ? `<a href="${row.image_url}" target="_blank">查看</a>` : '-'}</td>
          <td>${row.quantity}</td>
          <td>${row.status}</td>
          <td>${row.notes || '-'}</td>
          <td>${row.created_at || '-'}</td>
          <td>
            <div class="admin-actions">
              <input class="admin-input" data-reason="${row.id}" placeholder="原因（必填）" />
              <select class="admin-select" data-status="${row.id}">
                ${options}
              </select>
              <button class="admin-button secondary" data-action="status" data-id="${row.id}">更新</button>
            </div>
          </td>
        </tr>
      `;
        }
      )
      .join('');
  }

  async function loadUploads() {
    setStatus('加载中...', 'info');
    try {
      const data = await window.adminAuth.apiFetch('/api/order-uploads');
      renderRows(Array.isArray(data) ? data : []);
      setStatus('加载完成。', 'success');
    } catch (err) {
      bodyEl.innerHTML = '<tr><td colspan="9" class="admin-muted">加载失败</td></tr>';
      setStatus(err.message || '加载失败', 'error');
    }
  }

  async function handleAction(event) {
    const button = event.target.closest('button[data-action="status"]');
    if (!button) return;
    const id = button.getAttribute('data-id');
    const reasonInput = main.querySelector(`input[data-reason="${id}"]`);
    const reason = reasonInput ? reasonInput.value.trim() : '';
    const statusSelect = main.querySelector(`select[data-status="${id}"]`);
    const status = statusSelect ? statusSelect.value : '';
    if (!reason || !status) {
      setStatus('请输入原因并选择状态。', 'error');
      return;
    }
    try {
      await window.adminAuth.apiFetch(`/api/order-uploads/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, reason })
      });
      setStatus('更新成功，列表已刷新。', 'success');
      await loadUploads();
    } catch (err) {
      setStatus(err.message || '更新失败', 'error');
    }
  }

  bodyEl.addEventListener('click', handleAction);

  loadUploads();
})();
