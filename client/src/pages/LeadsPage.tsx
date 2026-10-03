import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { useDebounce } from '../hooks/useDebounce';
import { LEAD_STATUSES, type LeadList, type LeadStatus } from '../types';
import { errorMessage, formatDate } from '../utils';

const PAGE_SIZE = 10;

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<LeadList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listLeads({ search: debouncedSearch, status, page, limit: PAGE_SIZE })
      .then((r) => !cancelled && setResult(r))
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, status, page, reloadKey]);

  const leads = result?.data ?? [];
  const pagination = result?.pagination;
  const filtering = Boolean(debouncedSearch || status);

  return (
    <>
      <div className="page-head">
        <h1>Leads</h1>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search by name or email"
          aria-label="Search leads by name or email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as LeadStatus | '');
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="alert alert-row" role="alert">
          <span>{error}</span>
          <button className="btn" onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
        </div>
      )}

      <div className="panel table-wrap" aria-busy={loading}>
        {leads.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td data-label="Name"><Link to={`/leads/${lead.id}`} className="row-link">{lead.name}</Link></td>
                  <td data-label="Email">{lead.email}</td>
                  <td data-label="Phone">{lead.phone ?? '—'}</td>
                  <td data-label="Status"><StatusBadge status={lead.status} /></td>
                  <td data-label="Notes">{lead.notesCount}</td>
                  <td data-label="Created" className="muted">{formatDate(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : loading ? (
          <div className="empty"><p>Loading leads…</p></div>
        ) : (
          !error && (
            <div className="empty">
              {filtering ? (
                <p>No leads match your search or filter.</p>
              ) : (
                <>
                  <p>No leads yet.</p>
                  <Link to="/leads/new" className="btn btn-primary">Add your first lead</Link>
                </>
              )}
            </div>
          )
        )}
      </div>

      {pagination && pagination.total > 0 && (
        <div className="pager">
          <span className="muted">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} leads
          </span>
          <div className="pager-buttons">
            <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="btn" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </>
  );
}
