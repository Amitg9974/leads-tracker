const { createDb } = require('./db');
const { createApp } = require('./app');

const PORT = process.env.PORT || 4000;
const auth = {
  user: process.env.BASIC_AUTH_USER || 'admin',
  password: process.env.BASIC_AUTH_PASSWORD || 'admin123',
};
const app = createApp(createDb(), { auth });

app.listen(PORT, () => {
  console.log(`Leads API listening on http://localhost:${PORT} (Basic auth user: ${auth.user})`);
});
