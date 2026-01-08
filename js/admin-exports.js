(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: '导出中心', activeKey: 'exports' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">导出数据</div>
      <div id="exportsStatus" class="admin-alert info">选择导出类型后下载 CSV。</div>
      <div class="admin-actions">
        <button class="admin-button" data-type="ledger">导出账本</button>
        <button class="admin-button" data-type="orders">导出订单</button>
        <button class="admin-button" data-type="deposits">导出充值</button>
        <button class="admin-button" data-type="withdrawals">导出提现</button>
        <button class="admin-button" data-type="audit">导出审计</button>
      </div>
    </div>
  `;

  const statusEl = document.getElementById('exportsStatus');

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `admin-alert ${type}`;
  }

  async function handleExport(event) {
    const button = event.target.closest('button[data-type]');
    if (!button) return;
    const type = button.getAttribute('data-type');
    setStatus(`开始导出 ${type} 数据...`, 'info');
    try {
      const token = window.adminAuth.getToken();
      const res = await fetch(`/api/exports?type=${encodeURIComponent(type)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        throw new Error(`导出失败 (${res.status})`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      setStatus('导出完成。', 'success');
    } catch (err) {
      setStatus(err.message || '导出失败', 'error');
    }
  }

  main.addEventListener('click', handleExport);
})();
