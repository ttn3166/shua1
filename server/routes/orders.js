const express = require('express');
const { requireAuth, requirePermission } = require('../utils/middleware');
const { ok, fail } = require('../utils/response');
const { generateOrderNo, buildScopeFilter } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');

const router = express.Router();

router.get('/', requireAuth, requirePermission('orders.read'), (req, res) => {
  const { status, user_id: userId, order_no: orderNo } = req.query;
  let query = 'SELECT orders.* FROM orders JOIN users ON users.id = orders.user_id';
  const clauses = [];
  const params = {};
  if (status) {
    clauses.push('status = @status');
    params.status = status;
  }
  if (userId) {
    clauses.push('user_id = @user_id');
    params.user_id = userId;
  }
  if (orderNo) {
    clauses.push('order_no = @order_no');
    params.order_no = orderNo;
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

router.post('/', requireAuth, requirePermission('orders.adjust'), (req, res) => {
  const { user_id: userId, amount, status } = req.body || {};
  if (!userId || !amount) {
    return fail(res, 'Missing required fields', 400);
  }
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount)) {
    return fail(res, 'Invalid amount', 400);
  }
  const orderNo = generateOrderNo();
  const result = req.db
    .prepare('INSERT INTO orders (order_no, user_id, amount, status) VALUES (?, ?, ?, ?)')
    .run(orderNo, userId, numericAmount, status || 'created');
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'orders.create',
    entityType: 'orders',
    entityId: result.lastInsertRowid,
    reason: null,
    metadata: { order_no: orderNo }
  });
  return ok(res, { id: result.lastInsertRowid, order_no: orderNo });
});

router.post('/:id/adjust', requireAuth, requirePermission('orders.adjust'), (req, res) => {
  return fail(res, 'Order history cannot be edited directly. Use adjustment/reversal ledger entries.', 400);
});

module.exports = router;
