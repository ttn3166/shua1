const express = require('express');
const { requireAuth, requirePermission } = require('../utils/middleware');
const { ok, fail } = require('../utils/response');
const { logAudit } = require('../utils/audit');

const router = express.Router();

function isVisibleToUser(notice, user) {
  if (notice.visibility_type === 'all') return true;
  if (notice.visibility_type === 'level') {
    return notice.visibility_value === user.role;
  }
  if (notice.visibility_type === 'agent') {
    return notice.visibility_value && String(user.agent_id) === notice.visibility_value;
  }
  if (notice.visibility_type === 'user') {
    return notice.visibility_value && String(user.id) === notice.visibility_value;
  }
  return false;
}

function shouldShowNotice(db, notice, user) {
  if (notice.strategy === 'every_visit') return true;
  const read = db
    .prepare('SELECT read_at FROM notice_reads WHERE notice_id = ? AND user_id = ? ORDER BY read_at DESC LIMIT 1')
    .get(notice.id, user.id);
  if (!read) return true;
  if (notice.strategy === 'first_once') return false;
  if (notice.strategy === 'daily_once') {
    const today = db.prepare("SELECT date('now') AS day").get().day;
    const readDay = db.prepare('SELECT date(?) AS day').get(read.read_at).day;
    return today !== readDay;
  }
  return true;
}

router.get('/active', requireAuth, (req, res) => {
  const now = "datetime('now')";
  const notices = req.db
    .prepare(
      `SELECT * FROM notices WHERE status = 'published' AND (start_at IS NULL OR start_at <= ${now}) AND (end_at IS NULL OR end_at >= ${now}) ORDER BY created_at DESC`
    )
    .all();
  const visible = notices.filter((notice) => isVisibleToUser(notice, req.user));
  const filtered = visible.filter((notice) => shouldShowNotice(req.db, notice, req.user));
  const modal = filtered.find((notice) => notice.type === 'modal') || null;
  const banners = filtered.filter((notice) => notice.type === 'banner').slice(0, 2);
  const toasts = filtered.filter((notice) => notice.type === 'toast');
  return ok(res, { modal, banners, toasts });
});

router.post('/', requireAuth, requirePermission('notices.write'), (req, res) => {
  const { type, title, content, level, image_url: imageUrl, action_label: actionLabel, action_url: actionUrl, start_at: startAt, end_at: endAt, strategy, visibility_type: visibilityType, visibility_value: visibilityValue } = req.body || {};
  if (!type || !title || !content) {
    return fail(res, 'Missing required fields', 400);
  }
  const result = req.db
    .prepare(
      `INSERT INTO notices (type, title, content, level, image_url, action_label, action_url, start_at, end_at, strategy, visibility_type, visibility_value, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`
    )
    .run(type, title, content, level || 'info', imageUrl || null, actionLabel || null, actionUrl || null, startAt || null, endAt || null, strategy || 'every_visit', visibilityType || 'all', visibilityValue || null, req.user.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'notices.create',
    entityType: 'notices',
    entityId: result.lastInsertRowid,
    reason: null,
    metadata: { type, title }
  });
  return ok(res, { id: result.lastInsertRowid, status: 'draft' });
});

router.post('/:id/publish', requireAuth, requirePermission('notices.publish'), (req, res) => {
  const notice = req.db.prepare('SELECT * FROM notices WHERE id = ?').get(req.params.id);
  if (!notice) {
    return fail(res, 'Notice not found', 404);
  }
  req.db
    .prepare('UPDATE notices SET status = ?, published_by = ?, published_at = datetime(\'now\') WHERE id = ?')
    .run('published', req.user.id, notice.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'notices.publish',
    entityType: 'notices',
    entityId: notice.id,
    reason: null,
    metadata: null
  });
  return ok(res, { id: notice.id, status: 'published' });
});

router.post('/:id/unpublish', requireAuth, requirePermission('notices.publish'), (req, res) => {
  const notice = req.db.prepare('SELECT * FROM notices WHERE id = ?').get(req.params.id);
  if (!notice) {
    return fail(res, 'Notice not found', 404);
  }
  req.db.prepare('UPDATE notices SET status = ? WHERE id = ?').run('draft', notice.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'notices.unpublish',
    entityType: 'notices',
    entityId: notice.id,
    reason: null,
    metadata: null
  });
  return ok(res, { id: notice.id, status: 'draft' });
});

router.post('/:id/read', requireAuth, (req, res) => {
  const notice = req.db.prepare('SELECT * FROM notices WHERE id = ?').get(req.params.id);
  if (!notice) {
    return fail(res, 'Notice not found', 404);
  }
  req.db.prepare('INSERT OR IGNORE INTO notice_reads (notice_id, user_id) VALUES (?, ?)').run(notice.id, req.user.id);
  return ok(res, { id: notice.id, read: true });
});

module.exports = router;
