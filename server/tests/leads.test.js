const request = require('supertest');
const { createDb } = require('../src/db');
const { createApp } = require('../src/app');

let app;
beforeEach(() => {
  app = createApp(createDb(':memory:'), { auth: null });
});

const validLead = { name: 'Asha Patel', email: 'asha@example.com', phone: '+91 98765 43210' };
const createLead = (overrides = {}) => request(app).post('/api/leads').send({ ...validLead, ...overrides });

describe('POST /api/leads', () => {
  it('creates a lead with status "new" by default (201)', async () => {
    const res = await createLead();
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/leads/${res.body.id}`);
    expect(res.body).toMatchObject({ name: 'Asha Patel', email: 'asha@example.com', status: 'new' });
    expect(res.body.createdAt).toBeTruthy();
  });

  it('rejects missing name and invalid email (400)', async () => {
    const res = await request(app).post('/api/leads').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toMatchObject({ name: expect.any(String), email: expect.any(String) });
  });

  it('rejects an invalid status (400)', async () => {
    expect((await createLead({ status: 'won' })).status).toBe(400);
  });

  it('rejects a duplicate email (409)', async () => {
    await createLead();
    const res = await createLead({ email: 'ASHA@example.com' });
    expect(res.status).toBe(409);
  });

  it('rejects malformed JSON (400)', async () => {
    const res = await request(app).post('/api/leads').set('Content-Type', 'application/json').send('{oops');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/leads', () => {
  beforeEach(async () => {
    await createLead();
    await createLead({ name: 'Daniel Brooks', email: 'daniel@example.com', status: 'contacted' });
    await createLead({ name: 'Mei Tanaka', email: 'mei@corp.io', status: 'qualified' });
  });

  it('lists leads with pagination info', async () => {
    const res = await request(app).get('/api/leads?limit=2&page=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it('searches by name or email', async () => {
    expect((await request(app).get('/api/leads?search=tanaka')).body.data).toHaveLength(1);
    expect((await request(app).get('/api/leads?search=corp.io')).body.data).toHaveLength(1);
    expect((await request(app).get('/api/leads?search=100%25')).body.data).toHaveLength(0);
  });

  it('filters by status and validates it', async () => {
    expect((await request(app).get('/api/leads?status=contacted')).body.data).toHaveLength(1);
    expect((await request(app).get('/api/leads?status=bogus')).status).toBe(400);
  });
});

describe('GET/PATCH/DELETE /api/leads/:id', () => {
  it('returns 404 for a lead that does not exist', async () => {
    expect((await request(app).get('/api/leads/999')).status).toBe(404);
    expect((await request(app).patch('/api/leads/999').send({ status: 'lost' })).status).toBe(404);
    expect((await request(app).delete('/api/leads/999')).status).toBe(404);
  });

  it('returns 400 for a non-numeric id', async () => {
    expect((await request(app).get('/api/leads/abc')).status).toBe(400);
  });

  it('partially updates a lead', async () => {
    const { body } = await createLead();
    const res = await request(app).patch(`/api/leads/${body.id}`).send({ status: 'qualified' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Asha Patel', status: 'qualified' });
  });

  it('updates name, email and phone', async () => {
    const { body } = await createLead();
    const res = await request(app)
      .patch(`/api/leads/${body.id}`)
      .send({ name: 'Asha P.', email: 'new@example.com', phone: '' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Asha P.', email: 'new@example.com', phone: null });
  });

  it('rejects an invalid email or a duplicate email on update', async () => {
    const first = await createLead();
    await createLead({ email: 'other@example.com' });
    const bad = await request(app).patch(`/api/leads/${first.body.id}`).send({ email: 'nope' });
    expect(bad.status).toBe(400);
    const dup = await request(app).patch(`/api/leads/${first.body.id}`).send({ email: 'other@example.com' });
    expect(dup.status).toBe(409);
  });

  it('rejects an empty PATCH body (400)', async () => {
    const { body } = await createLead();
    expect((await request(app).patch(`/api/leads/${body.id}`).send({})).status).toBe(400);
  });

  it('deletes a lead and its notes (204)', async () => {
    const { body } = await createLead();
    await request(app).post(`/api/leads/${body.id}/notes`).send({ content: 'hello' });
    expect((await request(app).delete(`/api/leads/${body.id}`)).status).toBe(204);
    expect((await request(app).get(`/api/leads/${body.id}`)).status).toBe(404);
    expect((await request(app).get(`/api/leads/${body.id}/notes`)).status).toBe(404);
  });
});

describe('notes', () => {
  it('returns an empty array when a lead has no notes', async () => {
    const { body } = await createLead();
    const res = await request(app).get(`/api/leads/${body.id}/notes`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('adds multiple notes, newest first (201)', async () => {
    const { body } = await createLead();
    const first = await request(app).post(`/api/leads/${body.id}/notes`).send({ content: 'First call' });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ leadId: body.id, content: 'First call' });
    await request(app).post(`/api/leads/${body.id}/notes`).send({ content: 'Follow-up' });

    const list = await request(app).get(`/api/leads/${body.id}/notes`);
    expect(list.body.map((n) => n.content)).toEqual(['Follow-up', 'First call']);
  });

  it('rejects blank note content (400)', async () => {
    const { body } = await createLead();
    const res = await request(app).post(`/api/leads/${body.id}/notes`).send({ content: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when adding a note to a missing lead', async () => {
    const res = await request(app).post('/api/leads/999/notes').send({ content: 'hi' });
    expect(res.status).toBe(404);
  });
});

describe('unknown API routes', () => {
  it('return a JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/not found/i);
  });
});
