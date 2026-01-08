(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: '设置中心', activeKey: 'settings' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">设置中心</div>
      <p class="admin-muted">功能开发中，可接入 /api/settings 的配置管理。</p>
    </div>
  `;
})();
