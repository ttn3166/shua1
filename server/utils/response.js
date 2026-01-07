function ok(res, data) {
  return res.json({ success: true, data });
}

function fail(res, error, status = 400) {
  return res.status(status).json({ success: false, error });
}

module.exports = { ok, fail };
