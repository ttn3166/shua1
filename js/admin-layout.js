(function () {
  const ROLE_PERMISSIONS = {
    SuperAdmin: ['*'],
    Admin: [
      'dashboard.read',
      'users.read',
      'users.write',
      'users.freeze',
      'tasks.read',
      'tasks.write',
      'tasks.assign',
      'tasks.force_close',
      'orders.read',
      'orders.adjust',
      'orders.upload',
      'ledger.read',
      'ledger.write',
      'records.read',
      'records.export',
      'finance.deposit.approve',
      'finance.withdraw.approve',
      'settings.read',
      'settings.write',
      'settings.publish',
      'settings.rollback',
      'assets.upload',
      'assets.delete',
      'notices.write',
      'notices.publish',
      'audit.read',
      'approvals.read',
      'approvals.approve',
      'exports.export'
    ],
    Finance: [
      'dashboard.read',
      'ledger.read',
      'ledger.write',
      'records.read',
      'finance.deposit.approve',
      'finance.withdraw.approve',
      'exports.export',
      'orders.read',
      'orders.upload',
      'approvals.read'
    ],
    Ops: [
      'dashboard.read',
      'tasks.read',
      'tasks.write',
      'tasks.assign',
      'tasks.force_close',
      'orders.read',
      'users.read',
      'assets.upload',
      'assets.delete',
      'notices.write',
      'approvals.read'
    ],
    Support: [
      'dashboard.read',
      'users.read',
      'orders.read'
    ],
    Agent: [
      'dashboard.read',
      'users.read',
      'orders.read',
      'records.read'
    ]
  };

  function hasPermission(role, permission) {
    if (!permission) return true;
    const perms = ROLE_PERMISSIONS[role] || [];
    return perms.includes('*') || perms.includes(permission);
  }

  const menuSections = [
    {
      title: '总览',
      items: [{ key: 'dashboard', label: '仪表盘', href: '/admin.html', permission: 'dashboard.read' }]
    },
    {
      title: '财务中心',
      items: [
        { key: 'deposit', label: '充值审核', href: '/admin-deposit.html', permission: 'finance.deposit.approve' },
        { key: 'withdraw', label: '提现审核', href: '/admin-withdraw.html', permission: 'finance.withdraw.approve' },
        { key: 'ledger', label: '账本流水', href: '/admin-ledger.html', permission: 'ledger.read' },
        { key: 'approvals', label: '审批中心', href: '/admin-approvals.html', permission: 'approvals.read' },
        { key: 'exports', label: '导出中心', href: '/admin-exports.html', permission: 'exports.export' }
      ]
    },
    {
      title: '任务中心',
      items: [
        { key: 'task-templates', label: '任务模板', href: '/admin-tasks-templates.html', permission: 'tasks.read' },
        { key: 'task-instances', label: '任务分配/实例', href: '/admin-tasks-instances.html', permission: 'tasks.read' }
      ]
    },
    {
      title: '用户与订单',
      items: [
        { key: 'users', label: '用户管理', href: '/admin-users.html', permission: 'users.read' },
        { key: 'orders', label: '订单管理', href: '/admin-orders.html', permission: 'orders.read' },
        { key: 'order-uploads', label: '订单素材库', href: '/admin-order-uploads.html', permission: 'orders.upload' },
        { key: 'uploads', label: '上传管理', href: '/admin-uploads.html', permission: 'assets.upload' }
      ]
    },
    {
      title: '系统',
      items: [
        { key: 'notices', label: '公告通知', href: '/admin-notices.html', permission: 'notices.write' },
        { key: 'settings', label: '设置中心', href: '/admin-settings.html', permission: 'settings.read' },
        { key: 'audit', label: '审计日志', href: '/admin-audit.html', permission: 'audit.read' },
        { key: 'login-logs', label: '登录记录', href: '/admin-login-logs.html', permission: 'audit.read' },
        { key: 'ip-lookup', label: 'IP 查询', href: '/admin-ip-lookup.html', permission: 'audit.read' }
      ]
    }
  ];

  function renderAdminLayout({ title, activeKey }) {
    if (window.adminAuth && window.adminAuth.requireAuth) {
      const user = window.adminAuth.requireAuth();
      if (!user) return;
    }
    const main = document.getElementById('app');
    if (!main) {
      console.warn('[admin] app not found');
      return;
    }

    const dataPage = document.body.dataset.page;
    const currentKey = activeKey || dataPage || '';
    document.body.classList.add('admin-body', 'admin-page');
    document.title = title ? `${title} - 管理后台` : '管理后台';
    console.log(`[admin] page=${window.location.pathname} activeKey=${currentKey}`);

    const root = document.createElement('div');
    root.className = 'admin-layout';
    root.innerHTML = `
      <aside class="admin-sidebar">
        <div class="admin-sidebar-header">管理后台</div>
        ${menuSections
          .map((section) => {
            const filteredItems = section.items.filter((item) => {
              const user = window.adminAuth && window.adminAuth.getUser ? window.adminAuth.getUser() : null;
              return hasPermission(user && user.role, item.permission);
            });
            if (!filteredItems.length) return '';
            return `
          <div class="admin-nav-section">
            <div class="admin-nav-title">${section.title}</div>
            ${filteredItems
              .map(
                (item) => `
              <a class="admin-nav-link" href="${item.href}" data-key="${item.key}">${item.label}</a>
            `
              )
              .join('')}
          </div>
        `
          })
          .join('')}
      </aside>
      <div class="admin-content">
        <div class="admin-topbar">
          <div class="admin-topbar-title">${title || '管理后台'}</div>
          <div class="admin-user">
            <span id="adminUser"></span>
            <button class="admin-button secondary" id="adminLogout">退出登录</button>
          </div>
        </div>
        <div class="admin-content-body" id="adminContentBody"></div>
      </div>
    `;

    const contentBody = root.querySelector('#adminContentBody');
    contentBody.appendChild(main);
    document.body.innerHTML = '';
    document.body.appendChild(root);

    if (currentKey) {
      const activeLink = root.querySelector(`.admin-nav-link[data-key="${currentKey}"]`);
      if (activeLink) {
        activeLink.classList.add('active');
      }
    }

    const userEl = root.querySelector('#adminUser');
    const setUserLabel = (user) => {
      const label = user ? `${user.username || '管理员'}${user.role ? ` (${user.role})` : ''}` : '未登录';
      if (userEl) {
        userEl.textContent = label;
      }
    };
    const cachedUser = window.adminAuth && window.adminAuth.getUser ? window.adminAuth.getUser() : null;
    setUserLabel(cachedUser);
    if (window.adminAuth && window.adminAuth.refreshUser) {
      window.adminAuth.refreshUser().then(setUserLabel).catch(() => {});
    }

    const logoutBtn = root.querySelector('#adminLogout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (window.adminAuth && window.adminAuth.clearSession) {
          window.adminAuth.clearSession();
        }
        window.location.href = '/admin-login.html';
      });
    }
  }

  window.renderAdminLayout = renderAdminLayout;
})();
