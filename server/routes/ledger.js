const express = require('express');
const { requireAuth, requirePermission } = require('../utils/middleware');
const { ok, fail } = require('../utils/response');
const { logAudit } = require('../utils/audit');
const { buildScopeFilter } = require('../utils/helpers');

const router = express.Router();

router.get('/', requireAuth, requirePermission('ledger.read'), (req, res) => {
  const { user_id: userId, type } = req.query;
  let query = 'SELECT ledger.* FROM ledger JOIN users ON users.id = ledger.user_id';
  const params = {};
  const clauses = [];
  if (userId) {
    clauses.push('user_id = @user_id');
    params.user_id = userId;
  }
  if (type) {
    clauses.push('type = @type');
    params.type = type;
  }
  const scope = buildScopeFilter(req.user, 'users');
  if (scope.clause) {
    clauses.push(scope.clause);
    Object.assign(params, scope.params);
  }
  if (clauses.length) {
    query += ` WHERE ${clauses.join(' AND ')}`;
  }
  query += ' ORDER BY created_at DESC';
  const rows = req.db.prepare(query).all(params);
  return ok(res, rows);
});

router.post('/adjust', requireAuth, requirePermission('ledger.write'), (req, res) => {
  const { user_id: userId, amount, type, reason, order_no: orderNo } = req.body || {};
  if (!userId || !amount || !type || !reason) {
    return fail(res, 'Missing required fields', 400);
  }
  if (!['ADJUST', 'REVERSAL'].includes(type)) {
    return fail(res, 'Invalid type', 400);
  }
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount) || numericAmount === 0) {
    return fail(res, 'Invalid amount', 400);
  }
  const requiresApproval = type === 'REVERSAL' || numericAmount < 0;
  if (requiresApproval) {
    const payload = { userId, amount: numericAmount, type, reason, orderNo };
    const approval = req.db
      .prepare('INSERT INTO approvals (type, entity_id, requested_by, required_role, reason, payload_json) VALUES (?, ?, ?, ?, ?, ?)')
      .run('ledger_adjust', userId, req.user.id, 'Admin', reason, JSON.stringify(payload));
    logAudit(req.db, {
      actorId: req.user.id,
      action: 'ledger.adjust.request',
      entityType: 'ledger',
      entityId: approval.lastInsertRowid,
      reason,
      metadata: payload
    });
    return ok(res, { status: 'pending_approval', approval_id: approval.lastInsertRowid });
  }
  const result = req.db
    .prepare('INSERT INTO ledger (user_id, type, amount, order_no, reason, created_by) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, type, numericAmount, orderNo || null, reason, req.user.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'ledger.adjust',
    entityType: 'ledger',
    entityId: result.lastInsertRowid,
    reason,
    metadata: { userId, amount: numericAmount, type, orderNo }
  });
  return ok(res, { id: result.lastInsertRowid });
});

module.exports = router;
