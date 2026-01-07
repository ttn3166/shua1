const express = require('express');
const { requireAuth, requirePermission } = require('../utils/middleware');
const { ok, fail } = require('../utils/response');
const { logAudit } = require('../utils/audit');

const router = express.Router();

router.get('/', requireAuth, requirePermission('tasks.read'), (req, res) => {
  const rows = req.db.prepare('SELECT * FROM order_uploads ORDER BY created_at DESC').all();
  return ok(res, rows);
});

router.post('/', requireAuth, requirePermission('orders.upload'), (req, res) => {
  const { title, brand, image_url: imageUrl, quantity, notes, status } = req.body || {};
  if (!title || !brand || !imageUrl || !quantity) {
    return fail(res, 'Missing required fields', 400);
  }
  const qty = Number(quantity);
  if (Number.isNaN(qty) || qty <= 0) {
    return fail(res, 'Invalid quantity', 400);
  }
  const result = req.db
    .prepare(
      `INSERT INTO order_uploads
      (title, brand, image_url, quantity, notes, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      title,
      brand,
      imageUrl,
      qty,
      notes || null,
      status || 'active',
      req.user.id
    );
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'orders.upload',
    entityType: 'order_uploads',
    entityId: result.lastInsertRowid,
    reason: null,
    metadata: { title, brand, quantity: qty }
  });
  return ok(res, { id: result.lastInsertRowid, status: status || 'active' });
});

router.post('/:id/status', requireAuth, requirePermission('orders.upload'), (req, res) => {
  const { status, reason } = req.body || {};
  if (!status || !reason) {
    return fail(res, 'status and reason required', 400);
  }
  const result = req.db.prepare('UPDATE order_uploads SET status = ? WHERE id = ?').run(status, req.params.id);
  if (result.changes === 0) {
    return fail(res, 'Order upload not found', 404);
  }
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'orders.upload.status',
    entityType: 'order_uploads',
    entityId: req.params.id,
    reason,
    metadata: { status }
  });
  return ok(res, { id: Number(req.params.id), status });
});

module.exports = router;
