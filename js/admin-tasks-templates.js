(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: '任务模板', activeKey: 'task-templates' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">新建模板</div>
      <div id="templateStatus" class="admin-alert info">请填写模板信息。</div>
      <div class="admin-form-row">
        <input class="admin-input" id="tplName" placeholder="模板名称" />
        <input class="admin-input" id="tplOrderOptions" placeholder="订单数选项，如 3,5,10" />
        <input class="admin-input" id="tplMin" type="number" placeholder="最小比例 (%)" />
        <input class="admin-input" id="tplMax" type="number" placeholder="最大比例 (%)" />
      </div>
      <div class="admin-form-row">
        <input class="admin-input" id="tplRebateMin" type="number" placeholder="返利最小值" />
        <input class="admin-input" id="tplRebateMax" type="number" placeholder="返利最大值" />
        <input class="admin-input" id="tplLuckyPercent" type="number" placeholder="幸运奖励比例 (%)" />
        <input class="admin-input" id="tplLuckyAmount" type="number" placeholder="幸运奖励金额" />
      </div>
      <div class="admin-form-row">
        <input class="admin-input" id="tplDesc" placeholder="说明（可选）" />
        <label class="admin-muted">
          <input type="checkbox" id="tplEnabled" checked /> 启用
        </label>
      </div>
      <div class="admin-actions">
        <button class="admin-button" id="tplSubmit">创建模板</button>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-title">模板列表</div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>名称</th>
            <th>说明</th>
            <th>订单数选项</th>
            <th>比例范围</th>
            <th>返利</th>
            <th>幸运奖励</th>
            <th>启用</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="templateBody"></tbody>
      </table>
    </div>
  `;

  const statusEl = document.getElementById('templateStatus');
  const bodyEl = document.getElementById('templateBody');
  const submitBtn = document.getElementById('tplSubmit');

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `admin-alert ${type}`;
  }

  function parseOrderOptions(value) {
    return value
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => !Number.isNaN(item) && item > 0);
  }

  function parseNullableNumber(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    return Number.isNaN(num) ? null : num;
  }

  function renderRows(rows) {
    if (!rows.length) {
      bodyEl.innerHTML = '<tr><td colspan="10" class="admin-muted">暂无模板</td></tr>';
      return;
    }

    bodyEl.innerHTML = rows
      .map((row) => {
        let options = row.order_count_options;
        try {
          options = Array.isArray(row.order_count_options)
            ? row.order_count_options
            : JSON.parse(row.order_count_options || '[]');
        } catch (e) {
          options = [];
        }
        const toggleLabel = row.enabled ? '停用' : '启用';
        const toggleValue = row.enabled ? false : true;
        return `
          <tr>
            <td>${row.id}</td>
            <td>${row.name}</td>
            <td>${row.description || '-'}</td>
            <td>${options.join(', ') || '-'}</td>
            <td>${row.amount_min_percent} - ${row.amount_max_percent}</td>
            <td>${row.rebate_min || '-'} / ${row.rebate_max || '-'}</td>
            <td>${row.lucky_bonus_percent || '-'}% / ${row.lucky_bonus_amount || '-'}</td>
            <td>${row.enabled ? '是' : '否'}</td>
            <td>${row.created_at || '-'}</td>
            <td>
              <div class="admin-actions">
                <button class="admin-button secondary" data-action="toggle" data-id="${row.id}" data-enabled="${toggleValue}">${toggleLabel}</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  async function loadTemplates() {
    try {
      const data = await window.adminAuth.apiFetch('/api/tasks/templates');
      renderRows(Array.isArray(data) ? data : []);
    } catch (err) {
      bodyEl.innerHTML = '<tr><td colspan="10" class="admin-muted">加载失败</td></tr>';
      setStatus(err.message || '加载失败', 'error');
    }
  }

  async function handleSubmit() {
    const name = document.getElementById('tplName').value.trim();
    const orderOptionsRaw = document.getElementById('tplOrderOptions').value.trim();
    const min = Number(document.getElementById('tplMin').value);
    const max = Number(document.getElementById('tplMax').value);
    const description = document.getElementById('tplDesc').value.trim();
    const enabled = document.getElementById('tplEnabled').checked;
    const rebateMin = parseNullableNumber(document.getElementById('tplRebateMin').value);
    const rebateMax = parseNullableNumber(document.getElementById('tplRebateMax').value);
    const luckyBonusPercent = parseNullableNumber(document.getElementById('tplLuckyPercent').value);
    const luckyBonusAmount = parseNullableNumber(document.getElementById('tplLuckyAmount').value);

    if (!name || !orderOptionsRaw || Number.isNaN(min) || Number.isNaN(max)) {
      setStatus('请填写必填字段。', 'error');
      return;
    }

    const orderOptions = parseOrderOptions(orderOptionsRaw);
    if (!orderOptions.length) {
      setStatus('订单数选项格式不正确。', 'error');
      return;
    }

    try {
      await window.adminAuth.apiFetch('/api/tasks/templates', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          order_count_options: orderOptions,
          amount_min_percent: min,
          amount_max_percent: max,
          rebate_min: rebateMin,
          rebate_max: rebateMax,
          lucky_bonus_percent: luckyBonusPercent,
          lucky_bonus_amount: luckyBonusAmount,
          enabled
        })
      });
      setStatus('创建成功，列表已刷新。', 'success');
      await loadTemplates();
    } catch (err) {
      setStatus(err.message || '创建失败', 'error');
    }
  }

  async function handleToggle(event) {
    const button = event.target.closest('button[data-action="toggle"]');
    if (!button) return;
    const id = button.getAttribute('data-id');
    const enabled = button.getAttribute('data-enabled') === 'true';
    const reason = window.prompt('请输入操作原因：');
    if (!reason) {
      setStatus('请输入操作原因。', 'error');
      return;
    }
    try {
      await window.adminAuth.apiFetch(`/api/tasks/templates/${id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enabled, reason })
      });
      setStatus('操作成功，列表已刷新。', 'success');
      await loadTemplates();
    } catch (err) {
      setStatus(err.message || '操作失败', 'error');
    }
  }

  submitBtn.addEventListener('click', handleSubmit);
  bodyEl.addEventListener('click', handleToggle);

  loadTemplates();
})();
