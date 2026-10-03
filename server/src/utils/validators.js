const { HttpError } = require('./errors');

const STATUSES = ['new', 'contacted', 'qualified', 'lost'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{6,20}$/;

function fail(details) {
  throw new HttpError(400, 'Validation failed', details);
}

function assertObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }
}

/**
 * Validates lead input. With { partial: true } (PATCH) only the supplied fields
 * are checked; otherwise name and email are required (POST).
 * Returns a clean object containing only the allowed fields.
 */
function validateLeadInput(body, { partial = false } = {}) {
  assertObject(body);
  const errors = {};
  const data = {};

  if (!partial || 'name' in body) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) errors.name = 'Name is required';
    else if (name.length > 100) errors.name = 'Name must be 100 characters or fewer';
    else data.name = name;
  }

  if (!partial || 'email' in body) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) errors.email = 'Email is required';
    else if (!EMAIL_RE.test(email) || email.length > 254) errors.email = 'Email format is invalid';
    else data.email = email;
  }

  if ('phone' in body || !partial) {
    const raw = body.phone;
    if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
      data.phone = null;
    } else if (typeof raw !== 'string' || !PHONE_RE.test(raw.trim())) {
      errors.phone = 'Phone must be 6-20 digits and may include + ( ) - .';
    } else {
      data.phone = raw.trim();
    }
  }

  if ('status' in body) {
    if (!STATUSES.includes(body.status)) errors.status = `Status must be one of: ${STATUSES.join(', ')}`;
    else data.status = body.status;
  } else if (!partial) {
    data.status = 'new';
  }

  if (partial && Object.keys(errors).length === 0 && Object.keys(data).length === 0) {
    errors.body = 'Provide at least one of: name, email, phone, status';
  }

  if (Object.keys(errors).length) fail(errors);
  return data;
}

function validateNoteInput(body) {
  assertObject(body);
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) fail({ content: 'Note content is required' });
  if (content.length > 2000) fail({ content: 'Note must be 2000 characters or fewer' });
  return { content };
}

function parseId(raw) {
  if (!/^\d+$/.test(raw) || Number(raw) < 1) {
    throw new HttpError(400, 'Lead id must be a positive integer');
  }
  return Number(raw);
}

function toInt(raw, fallback, name, min, max = Infinity) {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    const range = max === Infinity ? `at least ${min}` : `between ${min} and ${max}`;
    fail({ [name]: `${name} must be an integer ${range}` });
  }
  return n;
}

function parseListQuery(query) {
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const status = typeof query.status === 'string' ? query.status.trim() : '';
  if (status && !STATUSES.includes(status)) {
    fail({ status: `Status must be one of: ${STATUSES.join(', ')}` });
  }
  return {
    search,
    status,
    page: toInt(query.page, 1, 'page', 1),
    limit: toInt(query.limit, 10, 'limit', 1, 100),
  };
}

module.exports = { STATUSES, validateLeadInput, validateNoteInput, parseId, parseListQuery };
