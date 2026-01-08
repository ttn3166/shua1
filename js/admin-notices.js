(function () {
  window.adminAuth.requireAuth();
  renderAdminLayout({ title: '公告通知', activeKey: 'notices' });

  const main = document.getElementById('app');
  main.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">公告通知</div>
      <p class="admin-muted">功能开发中，后续可接入 /api/notices 的管理能力。</p>
    </div>
  `;
})();
