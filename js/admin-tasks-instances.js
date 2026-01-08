(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: '任务实例', activeKey: 'task-instances' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">分配任务</div>
      <div id="instanceStatus" class="admin-alert info">请选择模板并填写分配信息。</div>
      <div class="admin-form-row">
        <input class="admin-input" id="assignUserId" placeholder="用户ID" />
        <select class="admin-select" id="assignTemplate"></select>
        <input class="admin-input" id="assignOrderCount" type="number" placeholder="订单数量" />
        <input class="admin-input" id="assignReason" placeholder="原因（必填）" />
      </div>
      <div class="admin-form-row">
        <input class="admin-input" id="assignMin" type="number" placeholder="最小比例" />
        <input class="admin-input" id="assignMax" type="number" placeholder="最大比例" />
      </div>
      <div class="admin-actions">
        <button class="admin-button" id="assignSubmit">分配任务</button>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-title">筛选</div>
      <div class="admin-form-row">
        <input class="admin-input" id="filterUserId" placeholder="用户ID" />
        <input class="admin-input" id="filterTemplateId" placeholder="模板ID" />
        <select class="admin-select" id="filterStatus">
          <option value="">全部状态</option>
          <option value="pending">pending</option>
          <option value="active">active</option>
          <option value="completed">completed</option>
          <option value="cancelled">cancelled</option>
        </select>
        <button class="admin-button secondary" id="filterSubmit">筛选</button>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-title">任务实例列表</div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户ID</th>
            <th>模板ID</th>
            <th>订单数</th>
            <th>状态</th>
            <th>比例范围</th>
            <th>创建时间</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="instanceBody"></tbody>
      </table>
    </div>
  `;

  const statusEl = document.getElementById('instanceStatus');
  const bodyEl = document.getElementById('instanceBody');
  const templateSelect = document.getElementById('assignTemplate');
  const assignMin = document.getElementById('assignMin');
  const assignMax = document.getElementById('assignMax');
  const submitBtn = document.getElementById('assignSubmit');
  const filterSubmit = document.getElementById('filterSubmit');
  let templates = [];
  let allInstances = [];

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `admin-alert ${type}`;
  }

  function parseOrderOptions(value) {
    try {
      return Array.isArray(value) ? value : JSON.parse(value || '[]');
    } catch (e) {
      return [];
    }
  }

  function renderTemplates(data) {
    templates = Array.isArray(data) ? data : [];
    if (!templates.length) {
      templateSelect.innerHTML = '<option value="">暂无模板</option>';
      assignMin.value = '';
      assignMax.value = '';
      return;
    }

    templateSelect.innerHTML = templates
      .map((tpl) => `<option value="${tpl.id}">${tpl.name} (#${tpl.id})</option>`)
      .join('');

    updateTemplateInfo();
  }

  function updateTemplateInfo() {
    const selectedId = Number(templateSelect.value);
    const tpl = templates.find((item) => item.id === selectedId);
    if (!tpl) {
      assignMin.value = '';
      assignMax.value = '';
      return;
    }
    assignMin.value = tpl.amount_min_percent;
    assignMax.value = tpl.amount_max_percent;
  }

  function renderInstances(rows) {
    if (!rows.length) {
      bodyEl.innerHTML = '<tr><td colspan="9" class="admin-muted">暂无任务实例</td></tr>';
      return;
    }

    bodyEl.innerHTML = rows
      .map((row) => {
        const status = String(row.status || '').toLowerCase();
        const canUpdate = status === 'pending';
        const canCancel = status === 'pending';
        let actionHtml = '<span class="admin-muted">-</span>';
        if (canUpdate || canCancel) {
          actionHtml = `
            <div class="admin-actions">
              ${canUpdate ? `<button class="admin-button" data-action="update" data-id="${row.id}">更新订单数</button>` : ''}
              ${canCancel ? `<button class="admin-button secondary" data-action="cancel" data-id="${row.id}">强制结束</button>` : ''}
            </div>
          `;
        }
        return `
        <tr>
          <td>${row.id}</td>
          <td>${row.user_id}</td>
          <td>${row.template_id}</td>
          <td>${row.order_count}</td>
          <td>${row.status}</td>
          <td>${row.amount_min_percent} - ${row.amount_max_percent}</td>
          <td>${row.created_at || '-'}</td>
          <td>${row.updated_at || '-'}</td>
          <td>${actionHtml}</td>
        </tr>
      `;
      })
      .join('');
  }

  function applyFilters() {
    const userId = document.getElementById('filterUserId').value.trim();
    const templateId = document.getElementById('filterTemplateId').value.trim();
    const status = document.getElementById('filterStatus').value.trim();

    const filtered = allInstances.filter((row) => {
      if (userId && String(row.user_id) !== userId) return false;
      if (templateId && String(row.template_id) !== templateId) return false;
      if (status && String(row.status) !== status) return false;
      return true;
    });
    renderInstances(filtered);
  }

  async function loadTemplates() {
    try {
      const data = await window.adminAuth.apiFetch('/api/tasks/templates');
      renderTemplates(data);
    } catch (err) {
      setStatus(err.message || '加载模板失败', 'error');
    }
  }

  async function loadInstances() {
    try {
      const data = await window.adminAuth.apiFetch('/api/tasks/instances');
      allInstances = Array.isArray(data) ? data : [];
      applyFilters();
    } catch (err) {
      bodyEl.innerHTML = '<tr><td colspan="9" class="admin-muted">加载失败</td></tr>';
      setStatus(err.message || '加载任务实例失败', 'error');
    }
  }

  async function handleAssign() {
    const userId = Number(document.getElementById('assignUserId').value);
    const templateId = Number(templateSelect.value);
    const orderCount = Number(document.getElementById('assignOrderCount').value);
    const reason = document.getElementById('assignReason').value.trim();
    const minPercent = Number(assignMin.value);
    const maxPercent = Number(assignMax.value);

    if (!userId || !templateId || !orderCount || !reason) {
      setStatus('请填写必填字段。', 'error');
      return;
    }

    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      setStatus('模板不存在。', 'error');
      return;
    }

    const options = parseOrderOptions(template.order_count_options);
    if (options.length && !options.includes(orderCount)) {
      setStatus('订单数不在模板允许范围内。', 'error');
      return;
    }

    if (Number.isNaN(minPercent) || Number.isNaN(maxPercent) || minPercent > maxPercent) {
      setStatus('比例范围填写不正确。', 'error');
      return;
    }

    try {
      await window.adminAuth.apiFetch('/api/tasks/instances', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          template_id: templateId,
          order_count: orderCount,
          amount_min_percent: minPercent,
          amount_max_percent: maxPercent,
          lucky_bonus_percent: template.lucky_bonus_percent,
          lucky_bonus_amount: template.lucky_bonus_amount,
          reason
        })
      });
      setStatus('分配成功，列表已刷新。', 'success');
      await loadInstances();
    } catch (err) {
      setStatus(err.message || '分配失败', 'error');
    }
  }

  async function handleInstanceAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.getAttribute('data-action');
    const id = button.getAttribute('data-id');

    if (action === 'update') {
      const newCountRaw = window.prompt('请输入新的订单数：');
      const reason = window.prompt('请输入操作原因：');
      const newCount = Number(newCountRaw);
      if (!newCountRaw || !reason) {
        setStatus('请输入订单数和原因。', 'error');
        return;
      }
      if (Number.isNaN(newCount) || newCount <= 0) {
        setStatus('订单数不正确。', 'error');
        return;
      }
      const instance = allInstances.find((row) => String(row.id) === String(id));
      const template = instance ? templates.find((item) => item.id === instance.template_id) : null;
      const options = template ? parseOrderOptions(template.order_count_options) : [];
      if (options.length && !options.includes(newCount)) {
        setStatus('订单数不在模板允许范围内。', 'error');
        return;
      }
      try {
        await window.adminAuth.apiFetch(`/api/tasks/instances/${id}/update`, {
          method: 'POST',
          body: JSON.stringify({ order_count: newCount, reason })
        });
        setStatus('更新成功，列表已刷新。', 'success');
        await loadInstances();
      } catch (err) {
        setStatus(err.message || '更新失败', 'error');
      }
      return;
    }

    if (action === 'cancel') {
      const reason = window.prompt('请输入强制结束原因：');
      if (!reason) {
        setStatus('请输入操作原因。', 'error');
        return;
      }
      try {
        await window.adminAuth.apiFetch(`/api/tasks/instances/${id}/cancel`, {
          method: 'POST',
          body: JSON.stringify({ reason })
        });
        setStatus('已强制结束任务。', 'success');
        await loadInstances();
      } catch (err) {
        setStatus(err.message || '强制结束失败', 'error');
      }
    }
  }

  templateSelect.addEventListener('change', updateTemplateInfo);
  submitBtn.addEventListener('click', handleAssign);
  bodyEl.addEventListener('click', handleInstanceAction);
  filterSubmit.addEventListener('click', applyFilters);

  Promise.all([loadTemplates(), loadInstances()]);
})();
