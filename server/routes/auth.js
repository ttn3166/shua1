const express = require('express');
const bcrypt = require('bcryptjs');
const { signToken } = require('../utils/auth');
const { ok, fail } = require('../utils/response');
const { requireAuth } = require('../utils/middleware');

const router = express.Router();
const MAX_FAILED = 5;
const COOLDOWN_MINUTES = 15;

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return fail(res, 'Missing credentials', 400);
  }
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  const attempt = req.db
    .prepare('SELECT * FROM login_attempts WHERE username = ? AND ip = ?')
    .get(username, ip);
  if (attempt && attempt.failed_count >= MAX_FAILED) {
    const blockUntil = req.db
      .prepare("SELECT datetime(?, '+' || ? || ' minutes') AS until")
      .get(attempt.last_failed_at, COOLDOWN_MINUTES).until;
    const now = req.db.prepare("SELECT datetime('now') AS now").get().now;
    if (now < blockUntil) {
      return fail(res, 'Too many attempts. Try again later.', 429);
    }
  }
  const user = req.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    if (attempt) {
      req.db
        .prepare("UPDATE login_attempts SET failed_count = failed_count + 1, last_failed_at = datetime('now') WHERE id = ?")
        .run(attempt.id);
    } else {
      req.db
        .prepare('INSERT INTO login_attempts (username, ip, failed_count) VALUES (?, ?, ?)')
        .run(username, ip, 1);
    }
    return fail(res, 'Invalid credentials', 401);
  }
  const okPassword = bcrypt.compareSync(password, user.password_hash);
  if (!okPassword) {
    if (attempt) {
      req.db
        .prepare("UPDATE login_attempts SET failed_count = failed_count + 1, last_failed_at = datetime('now') WHERE id = ?")
        .run(attempt.id);
    } else {
      req.db
        .prepare('INSERT INTO login_attempts (username, ip, failed_count) VALUES (?, ?, ?)')
        .run(username, ip, 1);
    }
    return fail(res, 'Invalid credentials', 401);
  }
  req.db.prepare('DELETE FROM login_attempts WHERE username = ? AND ip = ?').run(username, ip);
  req.db
    .prepare('INSERT INTO admin_login_logs (user_id, username, ip, user_agent) VALUES (?, ?, ?, ?)')
    .run(user.id, user.username, ip, req.headers['user-agent'] || null);
  const token = signToken({
    id: user.id,
    username: user.username,
    role: user.role,
    scope: user.scope,
    agent_id: user.agent_id,
    staff_id: user.staff_id
  });
  return ok(res, { token, user: { id: user.id, username: user.username, role: user.role } });
});

router.get('/me', requireAuth, (req, res) => {
  const user = req.db
    .prepare('SELECT id, username, role, scope, agent_id, staff_id, status, language FROM users WHERE id = ?')
    .get(req.user.id);
  return ok(res, user);
});

module.exports = router;
