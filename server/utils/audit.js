function logAudit(db, { actorId, action, entityType, entityId, reason, metadata }) {
  const stmt = db.prepare(
    'INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, reason, metadata) VALUES (?, ?, ?, ?, ?, ?)'
  );
  stmt.run(
    actorId,
    action,
    entityType,
    entityId || null,
    reason || null,
    metadata ? JSON.stringify(metadata) : null
  );
}

module.exports = { logAudit };
