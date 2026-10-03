import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import TextField from '../components/TextField';
import { useToast } from '../components/ToastProvider';
import { LEAD_STATUSES, type LeadInput, type LeadStatus } from '../types';
import { EMAIL_RE, errorMessage, PHONE_RE } from '../utils';

const FIELDS = ['name', 'email', 'phone'] as const;
type Field = (typeof FIELDS)[number];
type FieldErrors = Partial<Record<Field, string>>;
type Touched = Partial<Record<Field, boolean>>;

/** Returns an error message, or '' when the value is valid. */
function validateField(field: Field, raw: string): string {
  const value = raw.trim();
  switch (field) {
    case 'name':
      if (!value) return 'Name is required';
      if (value.length > 100) return 'Name must be 100 characters or fewer';
      return '';
    case 'email':
      if (!value) return 'Email is required';
      if (!EMAIL_RE.test(value)) return 'Enter a valid email address';
      return '';
    case 'phone':
      if (value && !PHONE_RE.test(value)) return 'Enter a valid phone number (6-20 digits; + ( ) - . allowed)';
      return '';
  }
}

const focusField = (field: Field) => document.getElementById(`lead-${field}`)?.focus();

export default function CreateLeadPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [values, setValues] = useState({ name: '', email: '', phone: '' });
  const [status, setStatus] = useState<LeadStatus>('new');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Touched>({});
  const [saving, setSaving] = useState(false);

  // Once a field has been visited, re-validate it on every keystroke so the
  // message appears and disappears as the value becomes invalid / valid.
  const onChange = (field: Field) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    if (touched[field]) setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  };

  const onBlur = (field: Field) => () => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, values[field]) }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    const found: FieldErrors = {};
    FIELDS.forEach((f) => {
      const message = validateField(f, values[f]);
      if (message) found[f] = message;
    });
    setErrors(found);
    setTouched({ name: true, email: true, phone: true });

    const firstInvalid = FIELDS.find((f) => found[f]);
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    const input: LeadInput = { name: values.name, email: values.email, status };
    if (values.phone.trim()) input.phone = values.phone;

    setSaving(true);
    try {
      const lead = await api.createLead(input);
      toast.success(`${lead.name} was added to your leads`);
      navigate(`/leads/${lead.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const details = err.details;
        const fromServer: FieldErrors = {};
        FIELDS.forEach((f) => {
          if (details[f]) fromServer[f] = details[f];
        });
        setErrors(fromServer);
        setTouched({ name: true, email: true, phone: true });
        const first = FIELDS.find((f) => fromServer[f]);
        if (first) focusField(first);
      }
      toast.error(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className="panel form-panel">
      <h1>New lead</h1>
      <form onSubmit={onSubmit} noValidate>
        <TextField
          id="lead-name"
          label="Name"
          value={values.name}
          onChange={onChange('name')}
          onBlur={onBlur('name')}
          error={errors.name}
          autoComplete="name"
          autoFocus
        />
        <TextField
          id="lead-email"
          label="Email"
          type="email"
          inputMode="email"
          value={values.email}
          onChange={onChange('email')}
          onBlur={onBlur('email')}
          error={errors.email}
          autoComplete="email"
        />
        <TextField
          id="lead-phone"
          label="Phone (optional)"
          type="tel"
          value={values.phone}
          onChange={onChange('phone')}
          onBlur={onBlur('phone')}
          error={errors.phone}
          autoComplete="tel"
        />
        <div className="field">
          <label htmlFor="lead-status">Status</label>
          <select id="lead-status" value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="actions">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={saving}
            onMouseDown={(e) => e.preventDefault()}
          >
            {saving ? 'Saving…' : 'Save lead'}
          </button>
          <Link to="/" className="btn">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
