(function () {
  const title = document.body.getAttribute('data-title') || '后台页面';
  const activeKey = document.body.getAttribute('data-active') || '';
  if (window.adminAuth && window.adminAuth.requireAuth) {
    window.adminAuth.requireAuth();
  }
  renderAdminLayout({ title, activeKey });

  const main = document.getElementById('app');
  if (main) {
    main.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-title">${title}</div>
        <p class="admin-muted">功能建设中，API 接口完成后将展示数据。</p>
      </div>
    `;
  }
})();
