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
    'exports.export',
    'tickets.read',
    'tickets.write'
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
    'tickets.read',
    'tickets.write',
    'approvals.read'
  ],
  Support: [
    'dashboard.read',
    'users.read',
    'tickets.read',
    'tickets.write',
    'orders.read'
  ],
  Agent: [
    'dashboard.read',
    'users.read',
    'orders.read',
    'records.read',
    'tickets.read',
    'tickets.write'
  ]
};

function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(permission);
}

module.exports = { ROLE_PERMISSIONS, hasPermission };
