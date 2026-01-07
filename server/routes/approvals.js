const express = require('express');
const { requireAuth, requirePermission } = require('../utils/middleware');
const { ok, fail } = require('../utils/response');
const { logAudit } = require('../utils/audit');

const router = express.Router();

router.get('/', requireAuth, requirePermission('approvals.read'), (req, res) => {
  const rows = req.db.prepare('SELECT * FROM approvals WHERE status = ? ORDER BY created_at DESC').all('pending');
  return ok(res, rows);
});

router.post('/:id/approve', requireAuth, requirePermission('approvals.approve'), (req, res) => {
  const approval = req.db.prepare('SELECT * FROM approvals WHERE id = ?').get(req.params.id);
  if (!approval) {
    return fail(res, 'Approval not found', 404);
  }
  if (approval.status !== 'pending') {
    return fail(res, 'Approval already processed', 400);
  }
  if (approval.requested_by === req.user.id) {
    return fail(res, 'Requester cannot approve', 400);
  }
  if (approval.required_role && approval.required_role !== req.user.role && req.user.role !== 'SuperAdmin') {
    return fail(res, 'Insufficient role', 403);
  }
  let metadata = null;
  if (approval.payload_json) {
    metadata = JSON.parse(approval.payload_json);
  }
  if (approval.type === 'ledger_adjust' && metadata) {
    req.db
      .prepare('INSERT INTO ledger (user_id, type, amount, order_no, reason, created_by) VALUES (?, ?, ?, ?, ?, ?)')
      .run(metadata.userId, metadata.type, metadata.amount, metadata.orderNo || null, metadata.reason, approval.requested_by);
  }
  if (approval.type === 'withdrawal' && metadata) {
    req.db
      .prepare('UPDATE withdrawals SET status = ?, reviewed_by = ?, reviewed_at = datetime(\'now\') WHERE id = ?')
      .run('approved', req.user.id, approval.entity_id);
    req.db
      .prepare('INSERT INTO ledger (user_id, type, amount, order_no, reason, created_by) VALUES (?, ?, ?, ?, ?, ?)')
      .run(metadata.userId || null, 'WITHDRAW', -Math.abs(metadata.amount), null, metadata.reason || 'Withdrawal approved', approval.requested_by);
  }
  req.db
    .prepare('UPDATE approvals SET status = ?, decided_by = ?, decided_at = datetime(\'now\') WHERE id = ?')
    .run('approved', req.user.id, approval.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'approvals.approve',
    entityType: 'approvals',
    entityId: approval.id,
    reason: approval.reason,
    metadata
  });
  return ok(res, { id: approval.id, status: 'approved' });
});

router.post('/:id/reject', requireAuth, requirePermission('approvals.approve'), (req, res) => {
  const { reason } = req.body || {};
  if (!reason) {
    return fail(res, 'Reason required', 400);
  }
  const approval = req.db.prepare('SELECT * FROM approvals WHERE id = ?').get(req.params.id);
  if (!approval) {
    return fail(res, 'Approval not found', 404);
  }
  if (approval.status !== 'pending') {
    return fail(res, 'Approval already processed', 400);
  }
  if (approval.requested_by === req.user.id) {
    return fail(res, 'Requester cannot reject', 400);
  }
  req.db
    .prepare('UPDATE approvals SET status = ?, decided_by = ?, decided_at = datetime(\'now\') WHERE id = ?')
    .run('rejected', req.user.id, approval.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'approvals.reject',
    entityType: 'approvals',
    entityId: approval.id,
    reason,
    metadata: null
  });
  return ok(res, { id: approval.id, status: 'rejected' });
});

module.exports = router;
