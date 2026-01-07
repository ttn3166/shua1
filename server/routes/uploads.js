const express = require('express');
const path = require('path');
const multer = require('multer');
const { requireAuth, requirePermission } = require('../utils/middleware');
const { ok, fail } = require('../utils/response');
const { logAudit } = require('../utils/audit');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return cb(new Error('Invalid file type'));
    }
    return cb(null, true);
  }
});

router.post('/', requireAuth, requirePermission('assets.upload'), upload.single('file'), (req, res) => {
  if (!req.file) {
    return fail(res, 'File required', 400);
  }
  const url = `/uploads/${req.file.filename}`;
  logAudit(req.db, {
    actorId: req.user.id,
    action: 'assets.upload',
    entityType: 'uploads',
    entityId: null,
    reason: null,
    metadata: { filename: req.file.filename }
  });
  return ok(res, { url });
});

module.exports = router;
