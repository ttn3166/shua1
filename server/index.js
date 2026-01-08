require('dotenv').config();
const express = require('express');
const path = require('path');
const { openDb, runMigrations } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const ledgerRoutes = require('./routes/ledger');
const financeRoutes = require('./routes/finance');
const noticeRoutes = require('./routes/notices');
const uploadRoutes = require('./routes/uploads');
const approvalRoutes = require('./routes/approvals');
const orderRoutes = require('./routes/orders');
const auditRoutes = require('./routes/audit');
const adminLogRoutes = require('./routes/admin_logs');
const exportRoutes = require('./routes/exports');
const settingsRoutes = require('./routes/settings');
const taskRoutes = require('./routes/tasks');
const orderUploadRoutes = require('./routes/order_uploads');
const publicRoutes = require('./routes/public');
const { ok } = require('./utils/response');

const app = express();
const db = openDb();
runMigrations(db);

app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  req.db = db;
  next();
});

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => ok(res, { status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/admin', adminLogRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/order-uploads', orderUploadRoutes);
app.use('/api/public', publicRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
