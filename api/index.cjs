const app = require('../dist/server.cjs');
module.exports = app.default || app;
