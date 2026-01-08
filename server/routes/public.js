const express = require('express');
const bcrypt = require('bcryptjs');
const { signToken, verifyToken } = require('../utils/auth');
const { ok, fail } = require('../utils/response');
const { generateOrderNo } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');

const router = express.Router();

function requirePublicAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    req.user = verifyToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

router.post('/register', (req, res) => {
  const { email, password, nickname } = req.body || {};
  if (!email || !password) {
    return fail(res, 'Missing credentials', 400);
  }
  const exists = req.db.prepare('SELECT id FROM users WHERE username = ?').get(email);
  if (exists) {
    return fail(res, 'User already exists', 409);
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = req.db
    .prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .run(email, hash, 'User');
  const user = { id: result.lastInsertRowid, username: email, role: 'User', nickname: nickname || null };
  const token = signToken({ id: user.id, username: user.username, role: user.role });
  return ok(res, { token, user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return fail(res, 'Missing credentials', 400);
  }
  const user = req.db.prepare('SELECT * FROM users WHERE username = ?').get(email);
  if (!user) {
    return fail(res, 'Invalid credentials', 401);
  }
  const okPassword = bcrypt.compareSync(password, user.password_hash);
  if (!okPassword) {
    return fail(res, 'Invalid credentials', 401);
  }
  const token = signToken({ id: user.id, username: user.username, role: user.role });
  return ok(res, { token, user: { id: user.id, username: user.username, role: user.role } });
});

router.get('/me', requirePublicAuth, (req, res) => {
  const user = req.db
    .prepare('SELECT id, username, role, status, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) {
    return fail(res, 'User not found', 404);
  }
  return ok(res, user);
});

router.get('/balance', requirePublicAuth, (req, res) => {
  const total = req.db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS balance FROM ledger WHERE user_id = ?')
    .get(req.user.id);
  return ok(res, { user_id: req.user.id, balance: total.balance });
});

router.get('/ledger', requirePublicAuth, (req, res) => {
  const rows = req.db
    .prepare('SELECT * FROM ledger WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  return ok(res, rows);
});

router.get('/deposits', requirePublicAuth, (req, res) => {
  const rows = req.db
    .prepare('SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  return ok(res, rows);
});

router.get('/withdrawals', requirePublicAuth, (req, res) => {
  const rows = req.db
    .prepare('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  return ok(res, rows);
});

router.get('/tasks', requirePublicAuth, (req, res) => {
  const rows = req.db
    .prepare(
      `SELECT task_instances.*, task_templates.name AS template_name
       FROM task_instances
       JOIN task_templates ON task_templates.id = task_instances.template_id
       WHERE task_instances.user_id = ?
       ORDER BY task_instances.created_at DESC`
    )
    .all(req.user.id);
  return ok(res, rows);
});

router.post('/tasks/:id/complete', requirePublicAuth, (req, res) => {
  const task = req.db
    .prepare('SELECT * FROM task_instances WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!task) {
    return fail(res, 'Task not found', 404);
  }
  if (task.status !== 'pending') {
    return fail(res, 'Task already processed', 400);
  }

  const template = req.db.prepare('SELECT * FROM task_templates WHERE id = ?').get(task.template_id);
  const rewardPercent = template ? Number(template.rebate_min || template.amount_min_percent || 0) : 0;
  const baseAmount = 100;
  const rewardAmount = Number(((baseAmount * rewardPercent) / 100).toFixed(2));
  const orderNo = generateOrderNo();

  req.db.prepare('UPDATE task_instances SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run('completed', task.id);
  req.db
    .prepare('INSERT INTO orders (order_no, user_id, amount, status, task_id) VALUES (?, ?, ?, ?, ?)')
    .run(orderNo, req.user.id, baseAmount, 'completed', task.id);
  req.db
    .prepare('INSERT INTO ledger (user_id, type, amount, order_no, reason, created_by) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.id, 'TASK_REWARD', rewardAmount, orderNo, 'Task completed reward', req.user.id);
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'tasks.complete',
    entityType: 'task_instances',
    entityId: task.id,
    reason: null,
    metadata: { order_no: orderNo, rewardAmount }
  });
  return ok(res, { id: task.id, status: 'completed', order_no: orderNo, reward: rewardAmount });
});

router.get('/orders', requirePublicAuth, (req, res) => {
  const rows = req.db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  return ok(res, rows);
});

module.exports = router;
