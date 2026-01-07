const express = require('express');
const { requireAuth, requirePermission } = require('../utils/middleware');
const { ok, fail } = require('../utils/response');
const { logAudit } = require('../utils/audit');

const router = express.Router();

router.get('/current', requireAuth, requirePermission('settings.read'), (req, res) => {
  const current = req.db
    .prepare("SELECT * FROM settings_versions WHERE status = 'published' ORDER BY created_at DESC LIMIT 1")
    .get();
  return ok(res, current || null);
});

router.post('/draft', requireAuth, requirePermission('settings.write'), (req, res) => {
  const { version, data } = req.body || {};
  if (!version || !data) {
    return fail(res, 'version and data required', 400);
  }
  const result = req.db
    .prepare('INSERT INTO settings_versions (version, data_json, status, created_by) VALUES (?, ?, ?, ?)')
    .run(version, JSON.stringify(data), 'draft', req.user.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'settings.draft',
    entityType: 'settings_versions',
    entityId: result.lastInsertRowid,
    reason: null,
    metadata: { version }
  });
  return ok(res, { id: result.lastInsertRowid, status: 'draft' });
});

router.post('/:id/publish', requireAuth, requirePermission('settings.publish'), (req, res) => {
  const row = req.db.prepare('SELECT * FROM settings_versions WHERE id = ?').get(req.params.id);
  if (!row) {
    return fail(res, 'Settings version not found', 404);
  }
  req.db.prepare("UPDATE settings_versions SET status = 'archived' WHERE status = 'published'").run();
  req.db.prepare("UPDATE settings_versions SET status = 'published' WHERE id = ?").run(row.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'settings.publish',
    entityType: 'settings_versions',
    entityId: row.id,
    reason: null,
    metadata: { version: row.version }
  });
  return ok(res, { id: row.id, status: 'published' });
});

router.post('/rollback', requireAuth, requirePermission('settings.rollback'), (req, res) => {
  const previous = req.db
    .prepare("SELECT * FROM settings_versions WHERE status = 'archived' ORDER BY created_at DESC LIMIT 1")
    .get();
  if (!previous) {
    return fail(res, 'No archived version to rollback', 400);
  }
  req.db.prepare("UPDATE settings_versions SET status = 'archived' WHERE status = 'published'").run();
  req.db.prepare("UPDATE settings_versions SET status = 'published' WHERE id = ?").run(previous.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'settings.rollback',
    entityType: 'settings_versions',
    entityId: previous.id,
    reason: null,
    metadata: { version: previous.version }
  });
  return ok(res, { id: previous.id, status: 'published' });
});

module.exports = router;
