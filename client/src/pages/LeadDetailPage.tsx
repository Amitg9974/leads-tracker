import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useConfirm } from '../components/ConfirmProvider';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/ToastProvider';
import { LEAD_STATUSES, type Lead, type LeadStatus, type Note } from '../types';
import { errorMessage, formatDate } from '../utils';

const NOTE_REQUIRED = 'Write something before adding a note.';

export default function LeadDetailPage() {
  const { id } = useParams();
  const leadId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [draft, setDraft] = useState('');
  const [noteError, setNoteError] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);
    Promise.all([api.getLead(leadId), api.listNotes(leadId)])
      .then(([l, n]) => {
        if (cancelled) return;
        setLead(l);
        setNotes(n);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && (e.status === 404 || e.status === 400)) setNotFound(true);
        else setError(errorMessage(e));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [leadId, reloadKey]);

  async function changeStatus(next: LeadStatus) {
    if (!lead || next === lead.status) return;
    setUpdatingStatus(true);
    try {
      setLead(await api.updateLead(lead.id, { status: next }));
      toast.success(`Status changed to ${next}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function deleteLead() {
    if (!lead) return;
    const confirmed = await confirm({
      title: 'Delete this lead?',
      message: `${lead.name} and all of their notes will be permanently deleted. This can't be undone.`,
      confirmLabel: 'Delete lead',
      danger: true,
    });
    if (!confirmed) return;

    setDeleting(true);
    try {
      await api.deleteLead(lead.id);
      toast.success(`${lead.name} was deleted`);
      navigate('/');
    } catch (e) {
      toast.error(errorMessage(e));
      setDeleting(false);
    }
  }

  function onDraftChange(value: string) {
    setDraft(value);
    if (noteError) setNoteError(value.trim() ? '' : NOTE_REQUIRED); // live: clears as soon as there's text
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!lead) return;
    const content = draft.trim();
    if (!content) {
      setNoteError(NOTE_REQUIRED);
      return;
    }
    setSavingNote(true);
    try {
      const note = await api.addNote(lead.id, content);
      setNotes((prev) => [note, ...prev]);
      setDraft('');
      setNoteError('');
      toast.success('Note added');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) return <div className="panel empty"><p>Loading lead…</p></div>;
  if (notFound)
    return (
      <div className="panel empty">
        <p>This lead doesn't exist or was deleted.</p>
        <Link to="/">Back to leads</Link>
      </div>
    );
  if (error || !lead)
    return (
      <div className="alert alert-row" role="alert">
        <span>{error ?? 'Could not load this lead.'}</span>
        <button className="btn" onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
      </div>
    );

  return (
    <>
      <p className="back-link"><Link to="/">← All leads</Link></p>

      <section className="panel detail-head">
        <div className="detail-info">
          <h1>{lead.name}</h1>
          <dl>
            <dt>Email</dt><dd><a href={`mailto:${lead.email}`}>{lead.email}</a></dd>
            <dt>Phone</dt><dd>{lead.phone ?? '—'}</dd>
            <dt>Created</dt><dd>{formatDate(lead.createdAt)}</dd>
          </dl>
        </div>
        <div className="detail-actions">
          <StatusBadge status={lead.status} />
          <div className="field">
            <label htmlFor="lead-status">Change status</label>
            <select
              id="lead-status"
              value={lead.status}
              disabled={updatingStatus}
              onChange={(e) => changeStatus(e.target.value as LeadStatus)}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-danger" onClick={deleteLead} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete lead'}
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Notes ({notes.length})</h2>
        <form onSubmit={addNote} className="note-form" noValidate>
          <div className="field">
            <label htmlFor="new-note" className="sr-only">New note</label>
            <textarea
              id="new-note"
              rows={3}
              maxLength={2000}
              placeholder="Add a note about this lead"
              value={draft}
              aria-invalid={!!noteError}
              aria-describedby={noteError ? 'new-note-error' : undefined}
              onChange={(e) => onDraftChange(e.target.value)}
            />
            {noteError && <p id="new-note-error" className="field-error">{noteError}</p>}
          </div>
          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={savingNote}>
              {savingNote ? 'Adding…' : 'Add note'}
            </button>
          </div>
        </form>

        {notes.length === 0 ? (
          <p className="muted">No notes yet. Add the first one above.</p>
        ) : (
          <ul className="notes">
            {notes.map((n) => (
              <li key={n.id}>
                <p>{n.content}</p>
                <span className="muted">{formatDate(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
