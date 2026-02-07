/**
 * Announcements View Component
 * Handles announcement listing, creation, read receipts, and acknowledgments
 * Matches Lightning's glassmorphism UI style
 */

import React, { useState, useEffect } from 'react';
import { Plus, X, ChevronLeft, Check, CheckCheck, Clock, Pin, Megaphone, Eye, Send } from 'lucide-react';
import { showError, showSuccess } from '../lib/toast';
import { sanitizeInput } from '../lib/inputValidation';
import {
  createAnnouncement,
  getGroupAnnouncements,
  getAnnouncementById,
  markAnnouncementRead,
  acknowledgeAnnouncement,
  getAnnouncementReceipts,
  getScheduledAnnouncements,
  publishAnnouncement,
  deleteAnnouncement,
  getUnreadAnnouncementCount,
  ANNOUNCEMENT_CATEGORIES,
} from '../lib/database';
import type { GroupRole, AnnouncementCategory, AnnouncementWithDetails } from '../types';
import { hasPermission } from '../lib/permissions';

interface AnnouncementsViewProps {
  nightMode: boolean;
  groupId: string;
  userId: string;
  userRole: GroupRole;
  onBack: () => void;
}

const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({ nightMode, groupId, userId, userRole, onBack }) => {
  const [announcements, setAnnouncements] = useState<AnnouncementWithDetails[]>([]);
  const [scheduledAnnouncements, setScheduledAnnouncements] = useState<AnnouncementWithDetails[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementWithDetails | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showReceipts, setShowReceipts] = useState(false);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'published' | 'scheduled'>('published');

  // Create form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('info');
  const [isPinned, setIsPinned] = useState(false);
  const [bypassMute, setBypassMute] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const canPost = hasPermission(userRole, 'canPostAnnouncements');

  useEffect(() => {
    loadAnnouncements();
  }, [groupId]);

  const loadAnnouncements = async () => {
    setLoading(true);
    const data = await getGroupAnnouncements(groupId);
    setAnnouncements(data);
    if (canPost) {
      const scheduled = await getScheduledAnnouncements(groupId);
      setScheduledAnnouncements(scheduled as unknown as AnnouncementWithDetails[]);
    }
    setLoading(false);
  };

  const handleSelectAnnouncement = async (announcement: AnnouncementWithDetails) => {
    const detailed = await getAnnouncementById(announcement.id, userId);
    if (detailed) {
      setSelectedAnnouncement(detailed);
      // Mark as read
      if (!detailed.user_read) {
        await markAnnouncementRead(announcement.id, userId);
      }
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedAnnouncement) return;
    const success = await acknowledgeAnnouncement(selectedAnnouncement.id, userId);
    if (success) {
      setSelectedAnnouncement({
        ...selectedAnnouncement,
        user_acknowledged: true,
        acknowledged_count: (selectedAnnouncement.acknowledged_count || 0) + 1,
      });
      showSuccess('Acknowledged');
    }
  };

  const handleViewReceipts = async () => {
    if (!selectedAnnouncement) return;
    const data = await getAnnouncementReceipts(selectedAnnouncement.id);
    setReceipts(data);
    setShowReceipts(true);
  };

  const handlePublishScheduled = async (announcementId: string) => {
    const success = await publishAnnouncement(announcementId);
    if (success) {
      showSuccess('Published');
      loadAnnouncements();
    }
  };

  const handleDelete = async (announcementId: string) => {
    const success = await deleteAnnouncement(announcementId);
    if (success) {
      showSuccess('Deleted');
      setSelectedAnnouncement(null);
      loadAnnouncements();
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      showError('Title and content are required');
      return;
    }

    const scheduledFor = scheduleDate && scheduleTime
      ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
      : undefined;

    const result = await createAnnouncement({
      groupId,
      authorId: userId,
      title: sanitizeInput(title.trim()),
      content: sanitizeInput(content.trim()),
      category,
      isPinned,
      bypassMute,
      scheduledFor,
    });

    if (result) {
      showSuccess(scheduledFor ? 'Announcement scheduled' : 'Announcement posted');
      setTitle('');
      setContent('');
      setCategory('info');
      setIsPinned(false);
      setBypassMute(false);
      setScheduleDate('');
      setScheduleTime('');
      setShowCreateForm(false);
      loadAnnouncements();
    } else {
      showError('Failed to create announcement');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getCategoryStyle = (cat: AnnouncementCategory) => ANNOUNCEMENT_CATEGORIES[cat];

  // ============================
  // RECEIPTS MODAL
  // ============================
  if (showReceipts && selectedAnnouncement) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div
          className={`flex items-center gap-3 px-4 py-3 border-b ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
          }}
        >
          <button
            onClick={() => setShowReceipts(false)}
            className={nightMode ? 'p-1 hover:bg-white/10 rounded-lg' : 'p-1 hover:bg-white/20 rounded-lg'}
          >
            <ChevronLeft className={nightMode ? 'w-5 h-5 text-slate-100' : 'w-5 h-5 text-black'} />
          </button>
          <h3 className={nightMode ? 'font-semibold text-slate-100 text-sm' : 'font-semibold text-black text-sm'}>
            Read Receipts
          </h3>
        </div>

        {/* Receipt List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {receipts.length === 0 ? (
            <p className={`text-center text-sm mt-8 ${nightMode ? 'text-slate-400' : 'text-black/50'}`}>
              No one has read this yet
            </p>
          ) : (
            receipts.map((receipt: any) => (
              <div
                key={receipt.id || receipt.user_id}
                className={`flex items-center justify-between p-3 rounded-xl ${nightMode ? 'bg-white/5' : ''}`}
                style={nightMode ? {} : {
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{receipt.user?.avatar_emoji || '👤'}</span>
                  <div>
                    <p className={nightMode ? 'text-sm font-medium text-slate-100' : 'text-sm font-medium text-black'}>
                      {receipt.user?.display_name || 'Unknown'}
                    </p>
                    <p className={`text-xs ${nightMode ? 'text-slate-400' : 'text-black/50'}`}>
                      Read {receipt.read_at ? formatDate(receipt.read_at) : ''}
                    </p>
                  </div>
                </div>
                {receipt.acknowledged_at && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20">
                    <CheckCheck className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400">Acknowledged</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ============================
  // ANNOUNCEMENT DETAIL VIEW
  // ============================
  if (selectedAnnouncement) {
    const catStyle = getCategoryStyle(selectedAnnouncement.category);

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div
          className={`flex items-center gap-3 px-4 py-3 border-b ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
          }}
        >
          <button
            onClick={() => setSelectedAnnouncement(null)}
            className={nightMode ? 'p-1 hover:bg-white/10 rounded-lg' : 'p-1 hover:bg-white/20 rounded-lg'}
          >
            <ChevronLeft className={nightMode ? 'w-5 h-5 text-slate-100' : 'w-5 h-5 text-black'} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ color: catStyle.color, backgroundColor: catStyle.bgColor }}
              >
                {catStyle.emoji} {catStyle.label}
              </span>
              {selectedAnnouncement.is_pinned && (
                <Pin className="w-3 h-3 text-amber-400" />
              )}
            </div>
          </div>
          {canPost && (
            <button
              onClick={() => handleDelete(selectedAnnouncement.id)}
              className="p-1.5 hover:bg-red-500/20 rounded-lg"
              title="Delete"
            >
              <X className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>

        {/* Announcement Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div
            className={`rounded-2xl p-5 ${nightMode ? 'bg-white/5' : ''}`}
            style={nightMode ? {} : {
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
            }}
          >
            <h2 className={nightMode ? 'text-lg font-bold text-slate-100 mb-2' : 'text-lg font-bold text-black mb-2'}>
              {selectedAnnouncement.title}
            </h2>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{selectedAnnouncement.author?.avatar_emoji || '👤'}</span>
              <span className={`text-xs ${nightMode ? 'text-slate-400' : 'text-black/60'}`}>
                {selectedAnnouncement.author?.display_name || 'Unknown'} &middot; {formatDate(selectedAnnouncement.created_at)}
              </span>
            </div>

            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${nightMode ? 'text-slate-200' : 'text-black/80'}`}>
              {selectedAnnouncement.content}
            </p>

            {/* Read/Acknowledged Stats */}
            {canPost && (
              <div className="mt-5 pt-4 border-t border-white/10">
                <button
                  onClick={handleViewReceipts}
                  className={`flex items-center gap-3 w-full text-left p-3 rounded-xl ${nightMode ? 'hover:bg-white/5' : 'hover:bg-white/10'}`}
                >
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-400" />
                    <span className={`text-sm ${nightMode ? 'text-slate-300' : 'text-black/70'}`}>
                      {selectedAnnouncement.read_count || 0} read
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-green-400" />
                    <span className={`text-sm ${nightMode ? 'text-slate-300' : 'text-black/70'}`}>
                      {selectedAnnouncement.acknowledged_count || 0} acknowledged
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Acknowledge Button */}
          {!selectedAnnouncement.user_acknowledged && (
            <button
              onClick={handleAcknowledge}
              className="w-full mt-4 py-3 rounded-2xl font-medium text-sm flex items-center justify-center gap-2"
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <CheckCheck className="w-4 h-4" />
              Acknowledge
            </button>
          )}
          {selectedAnnouncement.user_acknowledged && (
            <div className="w-full mt-4 py-3 rounded-2xl text-sm flex items-center justify-center gap-2 text-green-400 bg-green-500/10">
              <CheckCheck className="w-4 h-4" />
              Acknowledged
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================
  // CREATE FORM
  // ============================
  if (showCreateForm) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 py-3 border-b ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
          style={nightMode ? {} : {
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateForm(false)}
              className={nightMode ? 'p-1 hover:bg-white/10 rounded-lg' : 'p-1 hover:bg-white/20 rounded-lg'}
            >
              <ChevronLeft className={nightMode ? 'w-5 h-5 text-slate-100' : 'w-5 h-5 text-black'} />
            </button>
            <h3 className={nightMode ? 'font-semibold text-slate-100 text-sm' : 'font-semibold text-black text-sm'}>
              New Announcement
            </h3>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-1.5 rounded-xl text-xs font-medium"
            style={{
              background: 'rgba(59, 130, 246, 0.3)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            Post
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${nightMode ? 'text-slate-400' : 'text-black/60'}`}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title..."
              className={`w-full px-3 py-2.5 rounded-xl text-sm ${nightMode ? 'bg-white/10 text-slate-100 placeholder-slate-500' : 'text-black placeholder-black/40'}`}
              style={nightMode ? {} : {
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            />
          </div>

          {/* Content */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${nightMode ? 'text-slate-400' : 'text-black/60'}`}>
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement..."
              rows={5}
              className={`w-full px-3 py-2.5 rounded-xl text-sm resize-none ${nightMode ? 'bg-white/10 text-slate-100 placeholder-slate-500' : 'text-black placeholder-black/40'}`}
              style={nightMode ? {} : {
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            />
          </div>

          {/* Category Selector */}
          <div>
            <label className={`block text-xs font-medium mb-2 ${nightMode ? 'text-slate-400' : 'text-black/60'}`}>
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(ANNOUNCEMENT_CATEGORIES) as [AnnouncementCategory, typeof ANNOUNCEMENT_CATEGORIES[AnnouncementCategory]][]).map(([key, cat]) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${category === key ? 'ring-2 ring-offset-1' : ''}`}
                  style={{
                    background: category === key ? cat.bgColor : (nightMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)'),
                    color: category === key ? cat.color : (nightMode ? '#94a3b8' : 'rgba(0,0,0,0.6)'),
                    ringColor: cat.color,
                  }}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${nightMode ? 'bg-white/5' : ''}`}
              style={nightMode ? {} : {
                background: 'rgba(255, 255, 255, 0.15)',
              }}
            >
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded"
              />
              <div>
                <p className={`text-sm font-medium ${nightMode ? 'text-slate-200' : 'text-black/80'}`}>Pin to top</p>
                <p className={`text-xs ${nightMode ? 'text-slate-400' : 'text-black/50'}`}>Keep this announcement visible at the top</p>
              </div>
            </label>

            <label
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${nightMode ? 'bg-white/5' : ''}`}
              style={nightMode ? {} : {
                background: 'rgba(255, 255, 255, 0.15)',
              }}
            >
              <input
                type="checkbox"
                checked={bypassMute}
                onChange={(e) => setBypassMute(e.target.checked)}
                className="rounded"
              />
              <div>
                <p className={`text-sm font-medium ${nightMode ? 'text-slate-200' : 'text-black/80'}`}>Bypass mute</p>
                <p className={`text-xs ${nightMode ? 'text-slate-400' : 'text-black/50'}`}>Notify even muted members</p>
              </div>
            </label>
          </div>

          {/* Schedule */}
          <div>
            <label className={`block text-xs font-medium mb-2 ${nightMode ? 'text-slate-400' : 'text-black/60'}`}>
              Schedule (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className={`flex-1 px-3 py-2 rounded-xl text-sm ${nightMode ? 'bg-white/10 text-slate-100' : 'text-black'}`}
                style={nightMode ? {} : {
                  background: 'rgba(255, 255, 255, 0.2)',
                }}
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className={`w-28 px-3 py-2 rounded-xl text-sm ${nightMode ? 'bg-white/10 text-slate-100' : 'text-black'}`}
                style={nightMode ? {} : {
                  background: 'rgba(255, 255, 255, 0.2)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================
  // ANNOUNCEMENTS LIST
  // ============================
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
        style={nightMode ? {} : {
          background: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={nightMode ? 'p-1 hover:bg-white/10 rounded-lg' : 'p-1 hover:bg-white/20 rounded-lg'}
          >
            <ChevronLeft className={nightMode ? 'w-5 h-5 text-slate-100' : 'w-5 h-5 text-black'} />
          </button>
          <div className="flex items-center gap-2">
            <Megaphone className={nightMode ? 'w-4 h-4 text-slate-100' : 'w-4 h-4 text-black'} />
            <h3 className={nightMode ? 'font-semibold text-slate-100 text-sm' : 'font-semibold text-black text-sm'}>
              Announcements
            </h3>
          </div>
        </div>
        {canPost && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="p-2 rounded-xl"
            style={{
              background: 'rgba(59, 130, 246, 0.2)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
            title="New Announcement"
          >
            <Plus className="w-4 h-4 text-blue-400" />
          </button>
        )}
      </div>

      {/* Tabs (Published / Scheduled) */}
      {canPost && (
        <div
          className={`flex border-b ${nightMode ? 'border-white/10' : 'border-white/25'}`}
        >
          <button
            onClick={() => setTab('published')}
            className={`flex-1 py-2 text-xs font-medium transition-all ${
              tab === 'published'
                ? (nightMode ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600')
                : (nightMode ? 'text-slate-400' : 'text-black/50')
            }`}
          >
            Published ({announcements.length})
          </button>
          <button
            onClick={() => setTab('scheduled')}
            className={`flex-1 py-2 text-xs font-medium transition-all ${
              tab === 'scheduled'
                ? (nightMode ? 'text-amber-400 border-b-2 border-amber-400' : 'text-amber-600 border-b-2 border-amber-600')
                : (nightMode ? 'text-slate-400' : 'text-black/50')
            }`}
          >
            <Clock className="w-3 h-3 inline mr-1" />
            Scheduled ({scheduledAnnouncements.length})
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <div className={`text-center py-8 ${nightMode ? 'text-slate-400' : 'text-black/50'}`}>
            <p className="text-sm">Loading...</p>
          </div>
        )}

        {!loading && tab === 'published' && announcements.length === 0 && (
          <div className={`text-center py-12 ${nightMode ? 'text-slate-400' : 'text-black/50'}`}>
            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No announcements yet</p>
            {canPost && (
              <p className="text-xs mt-1">Create one to share important updates</p>
            )}
          </div>
        )}

        {!loading && tab === 'scheduled' && scheduledAnnouncements.length === 0 && (
          <div className={`text-center py-12 ${nightMode ? 'text-slate-400' : 'text-black/50'}`}>
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No scheduled announcements</p>
          </div>
        )}

        {/* Published Announcements */}
        {tab === 'published' && announcements.map((announcement) => {
          const catStyle = getCategoryStyle(announcement.category);
          return (
            <button
              key={announcement.id}
              onClick={() => handleSelectAnnouncement(announcement)}
              className={`w-full text-left p-4 rounded-2xl transition-all ${nightMode ? 'hover:bg-white/10' : 'hover:bg-white/30'}`}
              style={{
                background: nightMode ? 'rgba(255,255,255,0.05)' : 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderLeft: `3px solid ${catStyle.color}`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ color: catStyle.color, backgroundColor: catStyle.bgColor }}
                    >
                      {catStyle.emoji} {catStyle.label}
                    </span>
                    {announcement.is_pinned && (
                      <Pin className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  <h4 className={`text-sm font-semibold truncate ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                    {announcement.title}
                  </h4>
                  <p className={`text-xs mt-0.5 line-clamp-2 ${nightMode ? 'text-slate-400' : 'text-black/60'}`}>
                    {announcement.content}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[10px] ${nightMode ? 'text-slate-500' : 'text-black/40'}`}>
                    {formatDate(announcement.created_at)}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{announcement.author?.avatar_emoji || '👤'}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {/* Scheduled Announcements */}
        {tab === 'scheduled' && scheduledAnnouncements.map((announcement) => {
          const catStyle = getCategoryStyle(announcement.category || 'info');
          return (
            <div
              key={announcement.id}
              className={`p-4 rounded-2xl ${nightMode ? 'bg-white/5' : ''}`}
              style={nightMode ? {} : {
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderLeft: `3px solid ${catStyle.color}`,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ color: catStyle.color, backgroundColor: catStyle.bgColor }}
                    >
                      {catStyle.emoji} {catStyle.label}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-amber-400">
                      <Clock className="w-3 h-3" />
                      Scheduled
                    </span>
                  </div>
                  <h4 className={`text-sm font-semibold truncate ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                    {announcement.title}
                  </h4>
                  <p className={`text-xs mt-0.5 ${nightMode ? 'text-slate-400' : 'text-black/60'}`}>
                    {announcement.scheduled_for
                      ? `Scheduled for ${new Date(announcement.scheduled_for).toLocaleString()}`
                      : 'Draft'}
                  </p>
                </div>
                <button
                  onClick={() => handlePublishScheduled(announcement.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium"
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <Send className="w-3 h-3 inline mr-1" />
                  Publish
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnnouncementsView;
