import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import { ConfirmProvider } from './components/ConfirmProvider';
import { ToastProvider } from './components/ToastProvider';
import LeadsPage from './pages/LeadsPage';
import LeadDetailPage from './pages/LeadDetailPage';
import CreateLeadPage from './pages/CreateLeadPage';

function NotFound() {
  return (
    <div className="panel empty">
      <p>That page doesn't exist.</p>
      <Link to="/">Back to leads</Link>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <header className="topbar">
            <div className="container topbar-inner">
              <Link to="/" className="brand">Leads</Link>
              <NavLink to="/leads/new" className="btn btn-primary">New lead</NavLink>
            </div>
          </header>
          <main className="container">
            <Routes>
              <Route path="/" element={<LeadsPage />} />
              <Route path="/leads/new" element={<CreateLeadPage />} />
              <Route path="/leads/:id" element={<LeadDetailPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  );
}
