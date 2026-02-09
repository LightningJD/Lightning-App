import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Filter, Clock, ChevronDown } from 'lucide-react';
import { getAuditLog } from '../../lib/database/servers';

const ACTION_LABELS: Record<string, string> = {
  member_timeout: 'Timed out member',
  member_timeout_removed: 'Removed timeout',
  ownership_transferred: 'Transferred ownership',
  member_kicked: 'Kicked member',
  member_banned: 'Banned member',
  member_unbanned: 'Unbanned member',
  role_assigned: 'Changed role',
  channel_created: 'Created channel',
  channel_deleted: 'Deleted channel',
  channel_updated: 'Updated channel',
  server_updated: 'Updated server',
  category_created: 'Created category',
  category_deleted: 'Deleted category',
};

interface AuditLogProps {
  nightMode: boolean;
  serverId: string;
  onBack: () => void;
}

const PAGE_SIZE = 50;

const formatRelativeTime = (dateStr: string): string => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHr === 1) return '1 hour ago';
  if (diffHr < 24) return `${diffHr} hours ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  const weeks = Math.floor(diffDay / 7);
  if (diffDay < 30) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  return new Date(dateStr).toLocaleDateString();
};

const AuditLog: React.FC<AuditLogProps> = ({ nightMode, serverId, onBack }) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const nm = nightMode;

  const cardStyle = {
    background: nm ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
    border: `1px solid ${nm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
    backdropFilter: 'blur(20px)' as const,
    WebkitBackdropFilter: 'blur(20px)',
  };

  const loadEntries = async (offset: number, actionType?: string) => {
    const results = await getAuditLog(serverId, {
      limit: PAGE_SIZE,
      offset,
      actionType: actionType || undefined,
    });
    if (results.length < PAGE_SIZE) {
      setHasMore(false);
    }
    return results;
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHasMore(true);

    loadEntries(0, filterAction).then((results) => {
      if (!cancelled) {
        setEntries(results);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [serverId, filterAction]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const results = await loadEntries(entries.length, filterAction);
    setEntries((prev) => [...prev, ...results]);
    setLoadingMore(false);
  };

  const handleFilterChange = (actionType: string) => {
    setFilterAction(actionType);
    setShowFilterDropdown(false);
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: nm ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5"
        style={{
          borderBottom: `1px solid ${nm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          background: nm ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.3)',
        }}
      >
        <button
          onClick={onBack}
          className={`p-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${nm ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
          }}
        >
          <Shield className="w-4 h-4 text-white" />
        </div>
        <h2 className={`text-lg font-bold flex-1 ${nm ? 'text-white' : 'text-black'}`}>Audit Log</h2>
      </div>

      {/* Filter Bar */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: `1px solid ${nm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}
      >
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all w-full ${
              nm ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'
            }`}
            style={cardStyle}
          >
            <Filter className={`w-4 h-4 ${nm ? 'text-white/50' : 'text-black/50'}`} />
            <span className="flex-1 text-left">
              {filterAction ? ACTION_LABELS[filterAction] || filterAction : 'All Actions'}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilterDropdown ? 'rotate-180' : ''} ${nm ? 'text-white/40' : 'text-black/40'}`} />
          </button>

          {showFilterDropdown && (
            <div
              className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 max-h-64 overflow-y-auto"
              style={{
                ...cardStyle,
                background: nm ? 'rgba(30,30,30,0.98)' : 'rgba(255,255,255,0.98)',
                boxShadow: nm
                  ? '0 8px 32px rgba(0,0,0,0.5)'
                  : '0 8px 32px rgba(0,0,0,0.12)',
              }}
            >
              <button
                onClick={() => handleFilterChange('')}
                className={`w-full px-4 py-2.5 text-left text-sm transition-all ${
                  !filterAction
                    ? nm ? 'bg-white/10 text-white font-semibold' : 'bg-black/5 text-black font-semibold'
                    : nm ? 'text-white/70 hover:bg-white/5' : 'text-black/70 hover:bg-black/5'
                }`}
              >
                All Actions
              </button>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleFilterChange(key)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-all ${
                    filterAction === key
                      ? nm ? 'bg-white/10 text-white font-semibold' : 'bg-black/5 text-black font-semibold'
                      : nm ? 'text-white/70 hover:bg-white/5' : 'text-black/70 hover:bg-black/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: nm ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : entries.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 text-center ${nm ? 'text-white/40' : 'text-black/40'}`}>
            <Shield className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No audit log entries</p>
            <p className="text-xs mt-1 opacity-60">
              {filterAction ? 'Try a different filter' : 'Actions will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 pt-3">
            {entries.map((entry: any) => (
              <div
                key={entry.id}
                className="rounded-2xl p-3.5 transition-all"
                style={cardStyle}
              >
                <div className="flex items-start gap-3">
                  {/* Actor Avatar */}
                  <div className="flex-shrink-0">
                    {entry.actor?.avatar_url ? (
                      <img
                        src={entry.actor.avatar_url}
                        alt={entry.actor.display_name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-base"
                        style={{
                          background: nm
                            ? 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))'
                            : 'linear-gradient(135deg, rgba(0,0,0,0.06), rgba(0,0,0,0.03))',
                        }}
                      >
                        {entry.actor?.avatar_emoji || entry.actor?.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className={`text-sm font-semibold ${nm ? 'text-white' : 'text-black'}`}>
                        {entry.actor?.display_name || entry.actor?.username || 'Unknown'}
                      </span>
                      <span className={`text-xs ${nm ? 'text-white/50' : 'text-black/50'}`}>
                        {ACTION_LABELS[entry.action_type] || entry.action_type}
                      </span>
                    </div>

                    {/* Target info */}
                    {entry.target_name && (
                      <p className={`text-xs mt-0.5 ${nm ? 'text-white/40' : 'text-black/40'}`}>
                        Target: {entry.target_name}
                      </p>
                    )}

                    {/* Details */}
                    {entry.details?.reason && (
                      <p className={`text-xs mt-1 italic ${nm ? 'text-white/30' : 'text-black/30'}`}>
                        Reason: {entry.details.reason}
                      </p>
                    )}

                    {/* Timestamp */}
                    <div className={`flex items-center gap-1 mt-1.5 ${nm ? 'text-white/30' : 'text-black/30'}`}>
                      <Clock className="w-3 h-3" />
                      <span className="text-[11px]">{formatRelativeTime(entry.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-2 pb-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 ${
                    nm ? 'hover:bg-white/10 text-white/70' : 'hover:bg-black/5 text-black/70'
                  }`}
                  style={cardStyle}
                >
                  {loadingMore ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: nm ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', borderTopColor: 'transparent' }}
                      />
                      Loading...
                    </div>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
