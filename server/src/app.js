const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { createLeadsRouter } = require('./routes/leadsRoutes');
const { apiNotFound, errorHandler } = require('./middleware/errorHandler');
const { basicAuth } = require('./middleware/basicAuth');

/** @param {{ auth?: { user: string, password: string } | null }} [options] pass auth: null to disable (tests) */
function createApp(db, { auth } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  if (auth) app.use('/api', basicAuth(auth));
  app.use('/api/leads', createLeadsRouter(db));
  app.use('/api', apiNotFound);

  // After `npm run build`, serve the React app from the same server.
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
