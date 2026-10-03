const request = require('supertest');
const { createDb } = require('../src/db');
const { createApp } = require('../src/app');

const app = createApp(createDb(':memory:'), { auth: { user: 'admin', password: 'secret' } });

describe('Basic auth', () => {
  it('rejects requests without credentials (401 + WWW-Authenticate)', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toMatch(/^Basic/);
    expect(res.body.error.message).toMatch(/authentication/i);
  });

  it('rejects a wrong password (401)', async () => {
    const res = await request(app).get('/api/leads').auth('admin', 'wrong');
    expect(res.status).toBe(401);
  });

  it('allows correct credentials', async () => {
    const res = await request(app).get('/api/leads').auth('admin', 'secret');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
