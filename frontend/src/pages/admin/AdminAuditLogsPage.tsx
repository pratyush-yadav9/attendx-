import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  RotateCw, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  Globe,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { adminService, AuditLogItem } from '../../services/adminService';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  // Expanded log row
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminService.getAuditLogs(100);
      setLogs(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load system audit trail.');
    } finally {
      setIsLoading(false);
    }
  };

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  const filteredLogs = logs.filter(l => {
    if (selectedAction !== 'ALL' && l.action !== selectedAction) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEmail = l.user_email.toLowerCase().includes(q);
      const matchAction = l.action.toLowerCase().includes(q);
      const matchType = l.target_type.toLowerCase().includes(q);
      if (!matchEmail && !matchAction && !matchType) return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-10 h-10 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-attendx-muted">Fetching immutable system audit logs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="attendx-card p-8 text-center max-w-md mx-auto space-y-3">
          <AlertTriangle className="w-10 h-10 text-attendx-danger mx-auto" />
          <h2 className="text-base font-bold text-attendx-navy">Unable to load audit logs</h2>
          <p className="text-xs text-attendx-muted">{error}</p>
          <button onClick={loadLogs} className="attendx-btn-primary text-xs px-4 py-2 mt-2">
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
            System Compliance & Security
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight mt-0.5">
            Immutable Audit Trail & Forensics
          </h1>
          <p className="text-xs text-attendx-muted mt-1">
            Complete cryptographic audit trail recording all user actions, attendance submissions, and administrative events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadLogs}
            className="attendx-btn-secondary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 rounded-xl"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Refresh Trail
          </button>
          <Link
            to="/admin/dashboard"
            className="attendx-btn-secondary px-4 py-2 text-xs font-bold rounded-xl"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="attendx-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user, action, target..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="attendx-input pl-9 text-xs py-1.5 w-full"
            />
          </div>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="attendx-input text-xs py-1.5 px-3 min-w-[150px]"
          >
            <option value="ALL">All Actions</option>
            {uniqueActions.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>

          {(selectedAction !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedAction('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-attendx-danger font-bold hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        <span className="text-xs text-attendx-muted font-medium">
          Showing {filteredLogs.length} of {logs.length} logged events
        </span>
      </div>

      {/* Audit Logs Table */}
      <div className="attendx-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-attendx-border text-attendx-muted uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Target Type</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono whitespace-nowrap text-slate-600">
                          {log.timestamp}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-attendx-navy">{log.user_email}</p>
                          <span className="text-[10px] font-semibold text-attendx-blue uppercase">
                            {log.user_role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          {log.target_type}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {log.ip_address || '127.0.0.1'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="text-xs font-bold text-attendx-blue hover:underline inline-flex items-center gap-1"
                          >
                            {isExpanded ? 'Hide' : 'Inspect'}
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable JSON Detail Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={6} className="p-4">
                            <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 font-mono text-[11px] overflow-x-auto shadow-inner">
                              <div className="flex justify-between text-slate-400 mb-2 border-b border-slate-800 pb-1">
                                <span>Event Payload Details • ID: {log.id}</span>
                                <span>Target ID: {log.target_id || 'N/A'}</span>
                              </div>
                              <pre>{JSON.stringify(log.details || {}, null, 2)}</pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-attendx-muted">
                    No audit records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
