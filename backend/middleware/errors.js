function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}
function errorHandler(err, _req, res, _next) {
  console.error(err);
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
  if (err.code === 11000) return res.status(409).json({ message: 'That email is already registered.' });
  if (err.message === 'Origin is not allowed by CORS.') return res.status(403).json({ message: err.message });
  res.status(500).json({ message: 'Unexpected server error.' });
}
module.exports = { notFound, errorHandler };
