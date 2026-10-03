import type { LeadStatus } from '../types';

export default function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}
