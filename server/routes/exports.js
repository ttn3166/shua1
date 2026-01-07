const express = require('express');
const { requireAuth, requirePermission } = require('../utils/middleware');
const { fail } = require('../utils/response');
const { logAudit } = require('../utils/audit');

const router = express.Router();

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((key) => JSON.stringify(row[key] ?? '')).join(','));
  }
  return lines.join('\n');
}

router.get('/', requireAuth, requirePermission('exports.export'), (req, res) => {
  const { type } = req.query;
  let rows = [];
  let entityType = 'exports';
  if (type === 'ledger') {
    rows = req.db.prepare('SELECT * FROM ledger ORDER BY created_at DESC').all();
    entityType = 'ledger';
  } else if (type === 'orders') {
    rows = req.db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    entityType = 'orders';
  } else if (type === 'deposits') {
    rows = req.db.prepare('SELECT * FROM deposits ORDER BY created_at DESC').all();
    entityType = 'deposits';
  } else if (type === 'withdrawals') {
    rows = req.db.prepare('SELECT * FROM withdrawals ORDER BY created_at DESC').all();
    entityType = 'withdrawals';
  } else if (type === 'audit') {
    rows = req.db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC').all();
    entityType = 'audit_logs';
  } else {
    return fail(res, 'Invalid export type', 400);
  }
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'exports.export',
    entityType,
    entityId: null,
    reason: null,
    metadata: { type }
  });
  const csv = toCsv(rows);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${type}.csv`);
  return res.send(csv);
});

module.exports = router;
