const express = require('express');
const { requireAuth, requirePermission } = require('../utils/middleware');
const { ok, fail } = require('../utils/response');

const router = express.Router();

router.get('/login-logs', requireAuth, requirePermission('audit.read'), (req, res) => {
  const { ip, username, limit } = req.query || {};
  const filters = [];
  const params = [];

  if (ip) {
    filters.push('ip = ?');
    params.push(ip);
  }
  if (username) {
    filters.push('username LIKE ?');
    params.push(`%${username}%`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const rowLimit = Math.min(Number(limit) || 100, 500);
  const rows = req.db
    .prepare(`SELECT * FROM admin_login_logs ${whereClause} ORDER BY logged_at DESC LIMIT ?`)
    .all(...params, rowLimit);
  return ok(res, rows);
});

router.get('/ip-lookup', requireAuth, requirePermission('audit.read'), (req, res) => {
  const { ip } = req.query || {};
  if (!ip) {
    return fail(res, 'ip required', 400);
  }

  const summary = req.db
    .prepare('SELECT COUNT(*) AS total, MAX(logged_at) AS last_login FROM admin_login_logs WHERE ip = ?')
    .get(ip);
  const users = req.db
    .prepare(
      'SELECT username, COUNT(*) AS count, MAX(logged_at) AS last_login FROM admin_login_logs WHERE ip = ? GROUP BY username ORDER BY last_login DESC'
    )
    .all(ip);

  return ok(res, {
    ip,
    total: summary.total,
    last_login: summary.last_login,
    users
  });
});

module.exports = router;
