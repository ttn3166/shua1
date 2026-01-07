const express = require('express');
const { requireAuth, requirePermission } = require('../utils/middleware');
const { ok } = require('../utils/response');

const router = express.Router();

router.get('/', requireAuth, requirePermission('audit.read'), (req, res) => {
  const rows = req.db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC').all();
  return ok(res, rows);
});

module.exports = router;
