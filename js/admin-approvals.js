(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: '审批中心', activeKey: 'approvals' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">待审批事项</div>
      <div id="approvalsStatus" class="admin-alert info">加载中...</div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>类型</th>
            <th>实体ID</th>
            <th>发起人</th>
            <th>要求角色</th>
            <th>原因</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="approvalsBody"></tbody>
      </table>
    </div>
  `;

  const statusEl = document.getElementById('approvalsStatus');
  const bodyEl = document.getElementById('approvalsBody');

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `admin-alert ${type}`;
  }

  function renderRows(rows) {
    if (!rows.length) {
      bodyEl.innerHTML = '<tr><td colspan="8" class="admin-muted">暂无待审批记录</td></tr>';
      setStatus('暂无待审批记录。', 'info');
      return;
    }

    bodyEl.innerHTML = rows
      .map(
        (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${row.type}</td>
          <td>${row.entity_id}</td>
          <td>${row.requested_by}</td>
          <td>${row.required_role || '-'}</td>
          <td>${row.reason || '-'}</td>
          <td>${row.created_at || '-'}</td>
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

  async function loadApprovals() {
    setStatus('加载中...', 'info');
    try {
      const data = await window.adminAuth.apiFetch('/api/approvals');
      renderRows(Array.isArray(data) ? data : []);
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

    if (action === 'approve') {
      const ok = window.confirm('确认通过该审批？');
      if (!ok) return;
      try {
        await window.adminAuth.apiFetch(`/api/approvals/${id}/approve`, {
          method: 'POST',
          body: JSON.stringify({})
        });
        setStatus('审批通过，列表已刷新。', 'success');
        await loadApprovals();
      } catch (err) {
        setStatus(err.message || '审批失败', 'error');
      }
      return;
    }

    if (action === 'reject') {
      const reason = window.prompt('请输入拒绝原因：');
      if (!reason) {
        setStatus('请输入拒绝原因。', 'error');
        return;
      }
      try {
        await window.adminAuth.apiFetch(`/api/approvals/${id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason })
        });
        setStatus('已拒绝，列表已刷新。', 'success');
        await loadApprovals();
      } catch (err) {
        setStatus(err.message || '拒绝失败', 'error');
      }
    }
  }

  bodyEl.addEventListener('click', handleAction);

  loadApprovals();
})();
