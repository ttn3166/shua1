const express = require('express');
const { requireAuth, requirePermission } = require('../utils/middleware');
const { ok, fail } = require('../utils/response');
const { logAudit } = require('../utils/audit');

const router = express.Router();

router.get('/templates', requireAuth, requirePermission('tasks.read'), (req, res) => {
  const rows = req.db.prepare('SELECT * FROM task_templates ORDER BY created_at DESC').all();
  return ok(res, rows);
});

router.post('/templates', requireAuth, requirePermission('tasks.write'), (req, res) => {
  const {
    name,
    description,
    order_count_options: orderCountOptions,
    rebate_min: rebateMin,
    rebate_max: rebateMax,
    amount_min_percent: amountMinPercent,
    amount_max_percent: amountMaxPercent,
    lucky_bonus_percent: luckyBonusPercent,
    lucky_bonus_amount: luckyBonusAmount,
    enabled
  } = req.body || {};
  if (!name || !orderCountOptions || amountMinPercent == null || amountMaxPercent == null) {
    return fail(res, 'Missing required fields', 400);
  }
  const result = req.db
    .prepare(
      `INSERT INTO task_templates
      (name, description, order_count_options, rebate_min, rebate_max, amount_min_percent, amount_max_percent, lucky_bonus_percent, lucky_bonus_amount, enabled, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      description || null,
      JSON.stringify(orderCountOptions),
      rebateMin || null,
      rebateMax || null,
      amountMinPercent,
      amountMaxPercent,
      luckyBonusPercent || null,
      luckyBonusAmount || null,
      enabled === false ? 0 : 1,
      req.user.id
    );
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'tasks.template.create',
    entityType: 'task_templates',
    entityId: result.lastInsertRowid,
    reason: null,
    metadata: { name }
  });
  return ok(res, { id: result.lastInsertRowid });
});

router.post('/templates/:id/toggle', requireAuth, requirePermission('tasks.write'), (req, res) => {
  const { enabled, reason } = req.body || {};
  if (!reason) {
    return fail(res, 'Reason required', 400);
  }
  const value = enabled === false ? 0 : 1;
  const result = req.db.prepare('UPDATE task_templates SET enabled = ? WHERE id = ?').run(value, req.params.id);
  if (result.changes === 0) {
    return fail(res, 'Template not found', 404);
  }
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'tasks.template.toggle',
    entityType: 'task_templates',
    entityId: req.params.id,
    reason,
    metadata: { enabled: value }
  });
  return ok(res, { id: Number(req.params.id), enabled: value });
});

router.get('/instances', requireAuth, requirePermission('tasks.read'), (req, res) => {
  const rows = req.db
    .prepare('SELECT * FROM task_instances ORDER BY created_at DESC')
    .all();
  return ok(res, rows);
});

router.post('/instances', requireAuth, requirePermission('tasks.assign'), (req, res) => {
  const {
    user_id: userId,
    template_id: templateId,
    order_count: orderCount,
    amount_min_percent: amountMinPercent,
    amount_max_percent: amountMaxPercent,
    lucky_bonus_percent: luckyBonusPercent,
    lucky_bonus_amount: luckyBonusAmount,
    reason
  } = req.body || {};
  if (!userId || !templateId || !orderCount || amountMinPercent == null || amountMaxPercent == null || !reason) {
    return fail(res, 'Missing required fields', 400);
  }
  const template = req.db.prepare('SELECT * FROM task_templates WHERE id = ?').get(templateId);
  if (!template || template.enabled === 0) {
    return fail(res, 'Template not available', 400);
  }
  const result = req.db
    .prepare(
      `INSERT INTO task_instances
      (user_id, template_id, order_count, status, amount_min_percent, amount_max_percent, lucky_bonus_percent, lucky_bonus_amount, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      templateId,
      orderCount,
      'pending',
      amountMinPercent,
      amountMaxPercent,
      luckyBonusPercent || null,
      luckyBonusAmount || null,
      req.user.id
    );
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'tasks.assign',
    entityType: 'task_instances',
    entityId: result.lastInsertRowid,
    reason,
    metadata: { userId, templateId, orderCount }
  });
  return ok(res, { id: result.lastInsertRowid, status: 'pending' });
});

router.post('/instances/:id/update', requireAuth, requirePermission('tasks.write'), (req, res) => {
  const { order_count: orderCount, reason } = req.body || {};
  if (!reason) {
    return fail(res, 'Reason required', 400);
  }
  const instance = req.db.prepare('SELECT * FROM task_instances WHERE id = ?').get(req.params.id);
  if (!instance) {
    return fail(res, 'Task instance not found', 404);
  }
  if (instance.status !== 'pending') {
    return fail(res, 'Only pending tasks can be updated', 400);
  }
  if (!orderCount) {
    return fail(res, 'order_count required', 400);
  }
  req.db.prepare('UPDATE task_instances SET order_count = ? WHERE id = ?').run(orderCount, instance.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'tasks.update',
    entityType: 'task_instances',
    entityId: instance.id,
    reason,
    metadata: { orderCount }
  });
  return ok(res, { id: instance.id, order_count: orderCount });
});

router.post('/instances/:id/cancel', requireAuth, requirePermission('tasks.force_close'), (req, res) => {
  const { reason } = req.body || {};
  if (!reason) {
    return fail(res, 'Reason required', 400);
  }
  const instance = req.db.prepare('SELECT * FROM task_instances WHERE id = ?').get(req.params.id);
  if (!instance) {
    return fail(res, 'Task instance not found', 404);
  }
  req.db.prepare('UPDATE task_instances SET status = ? WHERE id = ?').run('cancelled', instance.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'tasks.cancel',
    entityType: 'task_instances',
    entityId: instance.id,
    reason,
    metadata: null
  });
  return ok(res, { id: instance.id, status: 'cancelled' });
});

module.exports = router;
