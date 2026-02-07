import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { getAllReports, getReportCounts, updateReportStatus } from '../lib/database/reporting';
import { showSuccess, showError } from '../lib/toast';

interface AdminDashboardProps {
  nightMode: boolean;
  onBack: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  reviewed: '#3b82f6',
  resolved: '#22c55e',
  dismissed: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  reviewed: 'Under Review',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ nightMode, onBack }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [counts, setCounts] = useState({ pending: 0, reviewed: 0, resolved: 0, dismissed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const nm = nightMode;

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportData, countData] = await Promise.all([
        getAllReports({ status: statusFilter || undefined, type: typeFilter || undefined }),
        getReportCounts(),
      ]);
      setReports(reportData);
      setCounts(countData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (reportId: string, status: 'reviewed' | 'resolved' | 'dismissed') => {
    const success = await updateReportStatus(reportId, status);
    if (success) {
      showSuccess(`Report ${STATUS_LABELS[status].toLowerCase()}`);
      loadData();
    } else {
      showError('Failed to update report');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const cardStyle = {
    background: nm ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
    border: `1px solid ${nm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        background: nm ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 sticky top-0 z-10"
        style={{
          background: nm ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderBottom: `1px solid ${nm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <button onClick={onBack} className={`p-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${nm ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
          <ArrowLeft className={`w-5 h-5 ${nm ? 'text-white' : 'text-black'}`} />
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 2px 8px rgba(239,68,68,0.25)' }}
        >
          <Shield className="w-4 h-4 text-white" />
        </div>
        <h2 className={`text-lg font-bold ${nm ? 'text-white' : 'text-black'}`}>Admin Dashboard</h2>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pending', count: counts.pending, color: '#f59e0b', icon: Clock },
            { label: 'Reviewing', count: counts.reviewed, color: '#3b82f6', icon: AlertTriangle },
            { label: 'Resolved', count: counts.resolved, color: '#22c55e', icon: CheckCircle },
            { label: 'Dismissed', count: counts.dismissed, color: '#6b7280', icon: XCircle },
          ].map(({ label, count, color, icon: Icon }) => (
            <div key={label} className="rounded-2xl p-4 text-center" style={cardStyle}>
              <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
              <div className={`text-2xl font-bold ${nm ? 'text-white' : 'text-black'}`}>{count}</div>
              <div className={`text-xs ${nm ? 'text-white/40' : 'text-black/40'}`}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className={`w-4 h-4 ${nm ? 'text-white/40' : 'text-black/40'}`} />
            <span className={`text-xs font-semibold ${nm ? 'text-white/40' : 'text-black/40'}`}>Filter:</span>
          </div>
          {['pending', 'reviewed', 'resolved', 'dismissed', ''].map((status) => (
            <button
              key={status || 'all'}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                statusFilter === status
                  ? 'text-white'
                  : nm ? 'text-white/50 hover:text-white/70' : 'text-black/50 hover:text-black/70'
              }`}
              style={{
                background: statusFilter === status
                  ? status ? STATUS_COLORS[status] : 'linear-gradient(135deg, #4F96FF, #2563eb)'
                  : nm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              }}
            >
              {status ? STATUS_LABELS[status] : 'All'}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex gap-2 flex-wrap">
          {['', 'user', 'testimony', 'message', 'group'].map((type) => (
            <button
              key={type || 'all-types'}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                typeFilter === type
                  ? 'text-white bg-blue-500'
                  : nm ? 'text-white/40 hover:text-white/60' : 'text-black/40 hover:text-black/60'
              }`}
              style={typeFilter !== type ? {
                background: nm ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              } : {}}
            >
              {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'All Types'}
            </button>
          ))}
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="text-center py-12">
            <div className={`text-sm ${nm ? 'text-white/40' : 'text-black/40'}`}>Loading reports...</div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: nm ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
            >
              <CheckCircle className="w-8 h-8" style={{ color: nm ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />
            </div>
            <p className={`text-sm ${nm ? 'text-white/40' : 'text-black/40'}`}>No reports found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const isExpanded = expandedReport === report.id;
              return (
                <div key={report.id} className="rounded-2xl overflow-hidden transition-all" style={cardStyle}>
                  {/* Report header */}
                  <button
                    onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 transition-all text-left ${nm ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.02]'}`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: STATUS_COLORS[report.status] || '#6b7280' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${nm ? 'text-white' : 'text-black'}`}>
                          {report.report_type?.charAt(0).toUpperCase()}{report.report_type?.slice(1)} Report
                        </span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${STATUS_COLORS[report.status]}20`,
                            color: STATUS_COLORS[report.status],
                          }}
                        >
                          {STATUS_LABELS[report.status] || report.status}
                        </span>
                      </div>
                      <div className={`text-xs mt-0.5 ${nm ? 'text-white/40' : 'text-black/40'}`}>
                        {report.reason} &middot; {formatDate(report.created_at)}
                      </div>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div
                      className="px-5 pb-4 space-y-3"
                      style={{ borderTop: `1px solid ${nm ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}
                    >
                      <div className="pt-3 space-y-2">
                        <div>
                          <span className={`text-xs font-semibold ${nm ? 'text-white/40' : 'text-black/40'}`}>Reporter ID</span>
                          <p className={`text-sm font-mono ${nm ? 'text-white/60' : 'text-black/60'}`}>
                            {report.reporter_id?.substring(0, 20)}...
                          </p>
                        </div>
                        {report.reported_user_id && (
                          <div>
                            <span className={`text-xs font-semibold ${nm ? 'text-white/40' : 'text-black/40'}`}>Reported User</span>
                            <p className={`text-sm font-mono ${nm ? 'text-white/60' : 'text-black/60'}`}>
                              {report.reported_user_id?.substring(0, 20)}...
                            </p>
                          </div>
                        )}
                        {report.details && (
                          <div>
                            <span className={`text-xs font-semibold ${nm ? 'text-white/40' : 'text-black/40'}`}>Details</span>
                            <p className={`text-sm ${nm ? 'text-white/70' : 'text-black/70'}`}>
                              {report.details}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Admin Actions */}
                      {report.status === 'pending' && (
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleUpdateStatus(report.id, 'reviewed')}
                            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                            style={{ background: 'rgba(59,130,246,0.85)', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" /> Review
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                              nm ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-black/5 text-black hover:bg-black/10'
                            }`}
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                      {report.status === 'reviewed' && (
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleUpdateStatus(report.id, 'resolved')}
                            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                            style={{ background: 'rgba(34,197,94,0.85)', boxShadow: '0 2px 8px rgba(34,197,94,0.3)' }}
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Resolve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                              nm ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-black/5 text-black hover:bg-black/10'
                            }`}
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
