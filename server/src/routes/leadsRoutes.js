const express = require('express');
const { leadRepository } = require('../repositories/leadRepository');
const { noteRepository } = require('../repositories/noteRepository');
const { leadsController } = require('../controllers/leadsController');

function createLeadsRouter(db) {
  const c = leadsController(leadRepository(db), noteRepository(db));
  const router = express.Router();

  router.get('/', c.list);
  router.post('/', c.create);
  router.get('/:id', c.get);
  router.patch('/:id', c.update);
  router.delete('/:id', c.remove);
  router.get('/:id/notes', c.listNotes);
  router.post('/:id/notes', c.createNote);

  return router;
}

module.exports = { createLeadsRouter };
