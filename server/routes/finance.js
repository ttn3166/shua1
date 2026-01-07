const express = require('express');
const { requireAuth, requirePermission } = require('../utils/middleware');
const { ok, fail } = require('../utils/response');
const { logAudit } = require('../utils/audit');

const router = express.Router();
const WITHDRAW_APPROVAL_THRESHOLD = Number(process.env.WITHDRAW_APPROVAL_THRESHOLD || 10000);

router.post('/deposits', requireAuth, (req, res) => {
  const { user_id: userId, amount, note, attachment_url: attachmentUrl } = req.body || {};
  const targetUserId = userId || req.user.id;
  if (!amount) {
    return fail(res, 'Amount required', 400);
  }
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    return fail(res, 'Invalid amount', 400);
  }
  const result = req.db
    .prepare('INSERT INTO deposits (user_id, amount, note, attachment_url, created_by) VALUES (?, ?, ?, ?, ?)')
    .run(targetUserId, numericAmount, note || null, attachmentUrl || null, req.user.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'deposits.create',
    entityType: 'deposits',
    entityId: result.lastInsertRowid,
    reason: note || null,
    metadata: { userId: targetUserId, amount: numericAmount }
  });
  return ok(res, { id: result.lastInsertRowid, status: 'pending' });
});

router.post('/deposits/:id/approve', requireAuth, requirePermission('finance.deposit.approve'), (req, res) => {
  const { reason } = req.body || {};
  const deposit = req.db.prepare('SELECT * FROM deposits WHERE id = ?').get(req.params.id);
  if (!deposit) {
    return fail(res, 'Deposit not found', 404);
  }
  if (deposit.status !== 'pending') {
    return fail(res, 'Deposit already processed', 400);
  }
  req.db.prepare('UPDATE deposits SET status = ?, reviewed_by = ?, reviewed_at = datetime(\'now\') WHERE id = ?')
    .run('approved', req.user.id, req.params.id);
  const ledger = req.db
    .prepare('INSERT INTO ledger (user_id, type, amount, order_no, reason, created_by) VALUES (?, ?, ?, ?, ?, ?)')
    .run(deposit.user_id, 'DEPOSIT', deposit.amount, null, reason || 'Deposit approved', req.user.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'deposits.approve',
    entityType: 'deposits',
    entityId: deposit.id,
    reason: reason || null,
    metadata: { ledger_id: ledger.lastInsertRowid }
  });
  return ok(res, { id: deposit.id, status: 'approved' });
});

router.post('/deposits/:id/reject', requireAuth, requirePermission('finance.deposit.approve'), (req, res) => {
  const { reason } = req.body || {};
  if (!reason) {
    return fail(res, 'Reason required', 400);
  }
  const deposit = req.db.prepare('SELECT * FROM deposits WHERE id = ?').get(req.params.id);
  if (!deposit) {
    return fail(res, 'Deposit not found', 404);
  }
  if (deposit.status !== 'pending') {
    return fail(res, 'Deposit already processed', 400);
  }
  req.db.prepare('UPDATE deposits SET status = ?, reviewed_by = ?, reviewed_at = datetime(\'now\') WHERE id = ?')
    .run('rejected', req.user.id, req.params.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'deposits.reject',
    entityType: 'deposits',
    entityId: deposit.id,
    reason,
    metadata: null
  });
  return ok(res, { id: deposit.id, status: 'rejected' });
});

router.post('/withdrawals', requireAuth, (req, res) => {
  const { user_id: userId, amount, note } = req.body || {};
  const targetUserId = userId || req.user.id;
  if (!amount) {
    return fail(res, 'Amount required', 400);
  }
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    return fail(res, 'Invalid amount', 400);
  }
  const result = req.db
    .prepare('INSERT INTO withdrawals (user_id, amount, note, created_by) VALUES (?, ?, ?, ?)')
    .run(targetUserId, numericAmount, note || null, req.user.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'withdrawals.create',
    entityType: 'withdrawals',
    entityId: result.lastInsertRowid,
    reason: note || null,
    metadata: { userId: targetUserId, amount: numericAmount }
  });
  return ok(res, { id: result.lastInsertRowid, status: 'pending' });
});

router.post('/withdrawals/:id/approve', requireAuth, requirePermission('finance.withdraw.approve'), (req, res) => {
  const { reason } = req.body || {};
  const withdrawal = req.db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(req.params.id);
  if (!withdrawal) {
    return fail(res, 'Withdrawal not found', 404);
  }
  if (withdrawal.status !== 'pending') {
    return fail(res, 'Withdrawal already processed', 400);
  }
  if (withdrawal.amount >= WITHDRAW_APPROVAL_THRESHOLD) {
    const payload = { withdrawalId: withdrawal.id, userId: withdrawal.user_id, amount: withdrawal.amount, reason: reason || null };
    const approval = req.db
      .prepare('INSERT INTO approvals (type, entity_id, requested_by, required_role, reason, payload_json) VALUES (?, ?, ?, ?, ?, ?)')
      .run('withdrawal', withdrawal.id, req.user.id, 'Admin', reason || 'Large withdrawal', JSON.stringify(payload));
    logAudit(req.db, {
      actorId: req.user.id,
      action: 'withdrawals.approval.request',
      entityType: 'withdrawals',
      entityId: withdrawal.id,
      reason: reason || null,
      metadata: { approval_id: approval.lastInsertRowid }
    });
    return ok(res, { status: 'pending_approval', approval_id: approval.lastInsertRowid });
  }
  req.db.prepare('UPDATE withdrawals SET status = ?, reviewed_by = ?, reviewed_at = datetime(\'now\') WHERE id = ?')
    .run('approved', req.user.id, withdrawal.id);
  const ledger = req.db
    .prepare('INSERT INTO ledger (user_id, type, amount, order_no, reason, created_by) VALUES (?, ?, ?, ?, ?, ?)')
    .run(withdrawal.user_id, 'WITHDRAW', -Math.abs(withdrawal.amount), null, reason || 'Withdrawal approved', req.user.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'withdrawals.approve',
    entityType: 'withdrawals',
    entityId: withdrawal.id,
    reason: reason || null,
    metadata: { ledger_id: ledger.lastInsertRowid }
  });
  return ok(res, { id: withdrawal.id, status: 'approved' });
});

router.post('/withdrawals/:id/paid', requireAuth, requirePermission('finance.withdraw.approve'), (req, res) => {
  const { payout_ref: payoutRef, reason } = req.body || {};
  if (!payoutRef) {
    return fail(res, 'payout_ref required', 400);
  }
  const withdrawal = req.db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(req.params.id);
  if (!withdrawal) {
    return fail(res, 'Withdrawal not found', 404);
  }
  req.db.prepare('UPDATE withdrawals SET status = ?, payout_ref = ?, reviewed_by = ?, reviewed_at = datetime(\'now\') WHERE id = ?')
    .run('paid', payoutRef, req.user.id, withdrawal.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'withdrawals.paid',
    entityType: 'withdrawals',
    entityId: withdrawal.id,
    reason: reason || null,
    metadata: { payout_ref: payoutRef }
  });
  return ok(res, { id: withdrawal.id, status: 'paid' });
});

router.post('/withdrawals/:id/reject', requireAuth, requirePermission('finance.withdraw.approve'), (req, res) => {
  const { reason } = req.body || {};
  if (!reason) {
    return fail(res, 'Reason required', 400);
  }
  const withdrawal = req.db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(req.params.id);
  if (!withdrawal) {
    return fail(res, 'Withdrawal not found', 404);
  }
  if (withdrawal.status !== 'pending') {
    return fail(res, 'Withdrawal already processed', 400);
  }
  req.db.prepare('UPDATE withdrawals SET status = ?, reviewed_by = ?, reviewed_at = datetime(\'now\') WHERE id = ?')
    .run('rejected', req.user.id, withdrawal.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'withdrawals.reject',
    entityType: 'withdrawals',
    entityId: withdrawal.id,
    reason,
    metadata: null
  });
  return ok(res, { id: withdrawal.id, status: 'rejected' });
});

router.get('/deposits', requireAuth, requirePermission('records.read'), (req, res) => {
  const rows = req.db.prepare('SELECT * FROM deposits ORDER BY created_at DESC').all();
  return ok(res, rows);
});

router.get('/withdrawals', requireAuth, requirePermission('records.read'), (req, res) => {
  const rows = req.db.prepare('SELECT * FROM withdrawals ORDER BY created_at DESC').all();
  return ok(res, rows);
});

module.exports = router;
