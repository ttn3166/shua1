(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: '用户管理', activeKey: 'users' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">用户列表</div>
      <div id="usersStatus" class="admin-alert info">加载中...</div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>角色</th>
            <th>状态</th>
            <th>Scope</th>
            <th>Agent</th>
            <th>Staff</th>
            <th>创建时间</th>
            <th>余额</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="usersBody"></tbody>
      </table>
    </div>
  `;

  const statusEl = document.getElementById('usersStatus');
  const bodyEl = document.getElementById('usersBody');

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `admin-alert ${type}`;
  }

  function renderRows(rows) {
    if (!rows.length) {
      bodyEl.innerHTML = '<tr><td colspan="10" class="admin-muted">暂无用户</td></tr>';
      setStatus('暂无用户记录。', 'info');
      return;
    }

    bodyEl.innerHTML = rows
      .map((user) => {
        const actionLabel = user.status === 'frozen' ? '解冻' : '冻结';
        const nextStatus = user.status === 'frozen' ? 'active' : 'frozen';
        return `
          <tr>
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.role}</td>
            <td>${user.status}</td>
            <td>${user.scope || '-'}</td>
            <td>${user.agent_id || '-'}</td>
            <td>${user.staff_id || '-'}</td>
            <td>${user.created_at || '-'}</td>
            <td>
              <div class="admin-actions">
                <button class="admin-button secondary" data-action="balance" data-id="${user.id}">查询余额</button>
                <span class="admin-muted" data-balance="${user.id}">-</span>
              </div>
            </td>
            <td>
              <div class="admin-actions">
                <button class="admin-button" data-action="freeze" data-id="${user.id}" data-status="${nextStatus}">${actionLabel}</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
    setStatus('加载成功。', 'success');
  }

  async function loadUsers() {
    setStatus('加载中...', 'info');
    try {
      const data = await window.adminAuth.apiFetch('/api/users');
      renderRows(Array.isArray(data) ? data : []);
    } catch (err) {
      bodyEl.innerHTML = '<tr><td colspan="10" class="admin-muted">加载失败</td></tr>';
      setStatus(err.message || '加载失败', 'error');
    }
  }

  async function handleAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.getAttribute('data-action');
    const id = button.getAttribute('data-id');

    if (action === 'balance') {
      try {
        const data = await window.adminAuth.apiFetch(`/api/users/${id}/balance`);
        const balanceEl = main.querySelector(`[data-balance="${id}"]`);
        if (balanceEl) {
          balanceEl.textContent = data && data.balance != null ? data.balance : '-';
        }
      } catch (err) {
        setStatus(err.message || '查询失败', 'error');
      }
      return;
    }

    if (action === 'freeze') {
      const reason = window.prompt('请输入操作原因：');
      const status = button.getAttribute('data-status');
      if (!reason) {
        setStatus('请输入操作原因。', 'error');
        return;
      }
      try {
        await window.adminAuth.apiFetch(`/api/users/${id}/freeze`, {
          method: 'POST',
          body: JSON.stringify({ reason, status })
        });
        setStatus('操作成功，列表已刷新。', 'success');
        await loadUsers();
      } catch (err) {
        setStatus(err.message || '操作失败', 'error');
      }
    }
  }

  bodyEl.addEventListener('click', handleAction);

  loadUsers();
})();
