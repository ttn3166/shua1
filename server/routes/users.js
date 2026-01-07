const express = require('express');
const { requireAuth, requirePermission } = require('../utils/middleware');
const { ok, fail } = require('../utils/response');
const { applyScope } = require('../utils/helpers');
const { loadLanguages } = require('../utils/languages');
const { logAudit } = require('../utils/audit');

const router = express.Router();

router.get('/', requireAuth, requirePermission('users.read'), (req, res) => {
  const { query, params } = applyScope(req.user, 'SELECT id, username, role, scope, agent_id, staff_id, status, created_at FROM users');
  const users = req.db.prepare(query).all(params);
  return ok(res, users);
});

router.get('/:id', requireAuth, requirePermission('users.read'), (req, res) => {
  const user = req.db
    .prepare('SELECT id, username, role, scope, agent_id, staff_id, status, created_at FROM users WHERE id = ?')
    .get(req.params.id);
  if (!user) {
    return fail(res, 'User not found', 404);
  }
  return ok(res, user);
});

router.get('/:id/balance', requireAuth, requirePermission('users.read'), (req, res) => {
  const total = req.db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS balance FROM ledger WHERE user_id = ?')
    .get(req.params.id);
  return ok(res, { user_id: Number(req.params.id), balance: total.balance });
});

router.get('/meta/languages', requireAuth, (req, res) => {
  const languages = loadLanguages();
  return ok(res, languages);
});

router.post('/me/language', requireAuth, (req, res) => {
  const { language } = req.body || {};
  if (!language) {
    return fail(res, 'language required', 400);
  }
  const languages = loadLanguages();
  const exists = languages.find((lang) => lang.code === language);
  if (!exists) {
    return fail(res, 'Unsupported language', 400);
  }
  req.db.prepare('UPDATE users SET language = ? WHERE id = ?').run(language, req.user.id);
  return ok(res, { id: req.user.id, language });
});

router.post('/:id/freeze', requireAuth, requirePermission('users.freeze'), (req, res) => {
  const { reason, status } = req.body || {};
  if (!reason) {
    return fail(res, 'Reason required', 400);
  }
  const newStatus = status === 'active' ? 'active' : 'frozen';
  const result = req.db.prepare('UPDATE users SET status = ? WHERE id = ?').run(newStatus, req.params.id);
  if (result.changes === 0) {
    return fail(res, 'User not found', 404);
  }
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'users.freeze',
    entityType: 'users',
    entityId: req.params.id,
    reason,
    metadata: { status: newStatus }
  });
  return ok(res, { id: Number(req.params.id), status: newStatus });
});

module.exports = router;
