(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: '账本流水', activeKey: 'ledger' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">筛选</div>
      <div id="ledgerStatus" class="admin-alert info">加载中...</div>
      <div class="admin-form-row">
        <input class="admin-input" id="ledgerUserId" placeholder="用户ID" />
        <input class="admin-input" id="ledgerType" placeholder="类型 (DEPOSIT/WITHDRAW/ADJUST/REVERSAL)" />
        <input class="admin-input" id="ledgerStart" type="date" />
        <input class="admin-input" id="ledgerEnd" type="date" />
        <button class="admin-button secondary" id="ledgerFilter">筛选</button>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-title">手工调整</div>
      <div class="admin-form-row">
        <input class="admin-input" id="adjustUserId" placeholder="用户ID" />
        <input class="admin-input" id="adjustAmount" type="number" placeholder="金额 (正负均可)" />
        <input class="admin-input" id="adjustType" placeholder="类型 ADJUST/REVERSAL" />
        <input class="admin-input" id="adjustOrderNo" placeholder="订单号 (可选)" />
      </div>
      <div class="admin-form-row">
        <input class="admin-input" id="adjustReason" placeholder="原因（必填）" />
        <button class="admin-button" id="adjustSubmit">提交调整</button>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-title">流水列表</div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户ID</th>
            <th>类型</th>
            <th>金额</th>
            <th>原因</th>
            <th>创建人</th>
            <th>创建时间</th>
          </tr>
        </thead>
        <tbody id="ledgerBody"></tbody>
      </table>
    </div>
  `;

  const statusEl = document.getElementById('ledgerStatus');
  const bodyEl = document.getElementById('ledgerBody');
  const filterBtn = document.getElementById('ledgerFilter');
  const adjustBtn = document.getElementById('adjustSubmit');
  let ledgerRows = [];

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `admin-alert ${type}`;
  }

  function inRange(dateValue, start, end) {
    if (!dateValue) return true;
    const ts = new Date(dateValue).getTime();
    if (Number.isNaN(ts)) return true;
    if (start) {
      const startTs = new Date(start).getTime();
      if (ts < startTs) return false;
    }
    if (end) {
      const endTs = new Date(end).getTime() + 86400000 - 1;
      if (ts > endTs) return false;
    }
    return true;
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
          <td>${row.user_id}</td>
          <td>${row.type}</td>
          <td>${row.amount}</td>
          <td>${row.reason || '-'}</td>
          <td>${row.created_by || '-'}</td>
          <td>${row.created_at || '-'}</td>
        </tr>
      `
      )
      .join('');
  }

  function applyFilters() {
    const userId = document.getElementById('ledgerUserId').value.trim();
    const type = document.getElementById('ledgerType').value.trim();
    const start = document.getElementById('ledgerStart').value;
    const end = document.getElementById('ledgerEnd').value;

    const filtered = ledgerRows.filter((row) => {
      if (userId && String(row.user_id) !== userId) return false;
      if (type && String(row.type) !== type) return false;
      if (!inRange(row.created_at, start, end)) return false;
      return true;
    });
    renderRows(filtered);
  }

  async function loadLedger() {
    const userId = document.getElementById('ledgerUserId').value.trim();
    const type = document.getElementById('ledgerType').value.trim();
    const params = new URLSearchParams();
    if (userId) params.set('user_id', userId);
    if (type) params.set('type', type);

    setStatus('加载中...', 'info');
    try {
      const data = await window.adminAuth.apiFetch(`/api/ledger?${params.toString()}`);
      ledgerRows = Array.isArray(data) ? data : [];
      applyFilters();
      setStatus('加载完成。', 'success');
    } catch (err) {
      bodyEl.innerHTML = '<tr><td colspan="7" class="admin-muted">加载失败</td></tr>';
      setStatus(err.message || '加载失败', 'error');
    }
  }

  async function submitAdjust() {
    const userId = document.getElementById('adjustUserId').value.trim();
    const amount = Number(document.getElementById('adjustAmount').value);
    const type = document.getElementById('adjustType').value.trim();
    const orderNo = document.getElementById('adjustOrderNo').value.trim();
    const reason = document.getElementById('adjustReason').value.trim();

    if (!userId || Number.isNaN(amount) || !type || !reason) {
      setStatus('请填写调整必填字段。', 'error');
      return;
    }

    try {
      const result = await window.adminAuth.apiFetch('/api/ledger/adjust', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          amount,
          type,
          order_no: orderNo || null,
          reason
        })
      });
      if (result && result.status === 'pending_approval') {
        setStatus('已提交审批中心。', 'success');
      } else {
        setStatus('调整成功，列表已刷新。', 'success');
      }
      await loadLedger();
    } catch (err) {
      setStatus(err.message || '调整失败', 'error');
    }
  }

  filterBtn.addEventListener('click', applyFilters);
  adjustBtn.addEventListener('click', submitAdjust);

  loadLedger();
})();
