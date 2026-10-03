const { HttpError } = require('../utils/errors');
const {
  validateLeadInput,
  validateNoteInput,
  parseId,
  parseListQuery,
} = require('../utils/validators');

function leadsController(leads, notes) {
  function getLeadOr404(req) {
    const lead = leads.findById(parseId(req.params.id));
    if (!lead) throw new HttpError(404, 'Lead not found');
    return lead;
  }

  return {
    list(req, res) {
      const { search, status, page, limit } = parseListQuery(req.query);
      const { rows, total } = leads.list({ search, status, limit, offset: (page - 1) * limit });
      res.json({
        data: rows,
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      });
    },

    create(req, res) {
      const lead = leads.create(validateLeadInput(req.body));
      res.status(201).location(`/api/leads/${lead.id}`).json(lead);
    },

    get(req, res) {
      res.json(getLeadOr404(req));
    },

    update(req, res) {
      const lead = getLeadOr404(req);
      res.json(leads.update(lead.id, validateLeadInput(req.body, { partial: true })));
    },

    remove(req, res) {
      const lead = getLeadOr404(req);
      leads.remove(lead.id); // notes are removed by ON DELETE CASCADE
      res.status(204).end();
    },

    listNotes(req, res) {
      const lead = getLeadOr404(req);
      res.json(notes.listByLead(lead.id));
    },

    createNote(req, res) {
      const lead = getLeadOr404(req);
      const { content } = validateNoteInput(req.body);
      res.status(201).json(notes.create(lead.id, content));
    },
  };
}

module.exports = { leadsController };
