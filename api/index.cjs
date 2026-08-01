try { const app = require('../dist/server.cjs'); module.exports = app.default || app; } catch (e) { module.exports = (req, res) => res.status(500).json({ error: e.message, stack: e.stack }); }
