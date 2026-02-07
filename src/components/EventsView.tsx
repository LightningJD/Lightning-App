/**
 * Events View Component
 * Handles event listing, creation, RSVP, and calendar view within groups
 * Matches Lightning's glassmorphism UI style
 */

import React, { useState, useEffect } from 'react';
import { Plus, Calendar, MapPin, Clock, ChevronLeft, ChevronRight, Check, HelpCircle, XCircle, Link as LinkIcon, Repeat } from 'lucide-react';
import { showError, showSuccess } from '../lib/toast';
import { sanitizeInput } from '../lib/inputValidation';
import {
  createEvent,
  getGroupEvents,
  getEventById,
  cancelEvent,
  rsvpToEvent,
  getEventRSVPs,
} from '../lib/database';
import type { GroupRole, EventWithDetails, RSVPStatus, EventRecurrence } from '../types';
import { hasPermission } from '../lib/permissions';

interface EventsViewProps {
  nightMode: boolean;
  groupId: string;
  userId: string;
  userRole: GroupRole;
  onBack: () => void;
}

const RECURRENCE_OPTIONS: { value: EventRecurrence; label: string }[] = [
  { value: 'once', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

const EventsView: React.FC<EventsViewProps> = ({ nightMode, groupId, userId, userRole, onBack }) => {
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventWithDetails | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [loading, setLoading] = useState(false);
  const [rsvpUsers, setRsvpUsers] = useState<any[]>([]);

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [recurrence, setRecurrence] = useState<EventRecurrence>('once');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [reminder24h, setReminder24h] = useState(true);
  const [reminder1h, setReminder1h] = useState(true);

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const canCreate = hasPermission(userRole, 'canCreateEvents');

  // Load events
  useEffect(() => {
    loadEvents();
  }, [groupId]);

  const loadEvents = async () => {
    setLoading(true);
    const data = await getGroupEvents(groupId);
    setEvents(data || []);
    setLoading(false);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !startTime) {
      showError('Title, date, and time are required');
      return;
    }

    setLoading(true);

    const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
    const endDateTime = endDate && endTime ? new Date(`${endDate}T${endTime}`).toISOString() : undefined;

    const event = await createEvent({
      groupId,
      creatorId: userId,
      title: sanitizeInput(title),
      description: description ? sanitizeInput(description) : undefined,
      startTime: startDateTime,
      endTime: endDateTime,
      location: location ? sanitizeInput(location) : undefined,
      locationUrl: locationUrl || undefined,
      recurrence,
      maxCapacity: maxCapacity ? parseInt(maxCapacity) : undefined,
      reminder24h,
      reminder1h,
    });

    if (event) {
      showSuccess('Event created!');
      resetForm();
      setShowCreateForm(false);
      await loadEvents();
    } else {
      showError('Failed to create event');
    }

    setLoading(false);
  };

  const handleRSVP = async (eventId: string, status: RSVPStatus) => {
    const result = await rsvpToEvent(eventId, userId, status);
    if (result) {
      showSuccess(`RSVP updated: ${status === 'going' ? 'Going' : status === 'maybe' ? 'Maybe' : "Can't make it"}`);
      await loadEvents();
      if (selectedEvent?.id === eventId) {
        const updated = await getEventById(eventId);
        if (updated) {
          setSelectedEvent(updated);
          const rsvps = await getEventRSVPs(eventId);
          setRsvpUsers(rsvps);
        }
      }
    } else {
      showError('Failed to update RSVP. Event may be at capacity.');
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to cancel this event?')) return;
    const result = await cancelEvent(eventId);
    if (result) {
      showSuccess('Event cancelled');
      setSelectedEvent(null);
      await loadEvents();
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setLocation('');
    setLocationUrl('');
    setRecurrence('once');
    setMaxCapacity('');
    setReminder24h(true);
    setReminder1h(true);
  };

  const openEventDetail = async (event: EventWithDetails) => {
    setSelectedEvent(event);
    const rsvps = await getEventRSVPs(event.id);
    setRsvpUsers(rsvps);
  };

  const formatEventDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatEventTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getUserRsvpStatus = (event: EventWithDetails): RSVPStatus | null => {
    const rsvp = event.rsvps?.find((r: any) => r.user_id === userId);
    return rsvp ? (rsvp as any).status : null;
  };

  // Glassmorphic card style
  const cardStyle = nightMode ? {} : {
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.4)',
  };

  const inputClass = nightMode
    ? 'w-full px-4 py-2.5 bg-white/5 border border-white/10 text-slate-100 placeholder-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
    : 'w-full px-4 py-2.5 bg-white/80 border border-white/30 text-black placeholder-black/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md text-sm';

  // ==========================================
  // EVENT DETAIL VIEW
  // ==========================================
  if (selectedEvent) {
    const userRsvp = getUserRsvpStatus(selectedEvent);
    const isCreator = selectedEvent.creator_id === userId;
    const spotsLeft = selectedEvent.max_capacity
      ? selectedEvent.max_capacity - (selectedEvent.going_count || 0)
      : null;

    return (
      <div className="py-4 px-4 space-y-4 pb-24">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setSelectedEvent(null)} className="text-blue-600 text-sm font-semibold">
            ← Back to Events
          </button>
        </div>

        {/* Event Card */}
        <div
          className={`rounded-2xl border p-5 ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
          style={cardStyle}
        >
          <h2 className={`text-xl font-bold mb-3 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
            {selectedEvent.title}
          </h2>

          {selectedEvent.description && (
            <p className={`text-sm mb-4 leading-relaxed ${nightMode ? 'text-slate-300' : 'text-black/70'}`}>
              {selectedEvent.description}
            </p>
          )}

          <div className="space-y-2.5 mb-4">
            <div className="flex items-center gap-2.5">
              <Calendar className={`w-4 h-4 flex-shrink-0 ${nightMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <span className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                {formatEventDate(selectedEvent.start_time)}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className={`w-4 h-4 flex-shrink-0 ${nightMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <span className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                {formatEventTime(selectedEvent.start_time)}
                {selectedEvent.end_time && ` - ${formatEventTime(selectedEvent.end_time)}`}
              </span>
            </div>
            {selectedEvent.location && (
              <div className="flex items-center gap-2.5">
                <MapPin className={`w-4 h-4 flex-shrink-0 ${nightMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                  {selectedEvent.location}
                </span>
                {selectedEvent.location_url && (
                  <a
                    href={selectedEvent.location_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
            {selectedEvent.recurrence !== 'once' && (
              <div className="flex items-center gap-2.5">
                <Repeat className={`w-4 h-4 flex-shrink-0 ${nightMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                  {RECURRENCE_OPTIONS.find(r => r.value === selectedEvent.recurrence)?.label}
                </span>
              </div>
            )}
          </div>

          {/* RSVP Counts */}
          <div className={`flex gap-3 py-3 border-t border-b mb-4 ${nightMode ? 'border-white/10' : 'border-white/25'}`}>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-500" />
              <span className={`text-sm font-semibold ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                {selectedEvent.going_count || 0} going
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-yellow-500" />
              <span className={`text-sm ${nightMode ? 'text-slate-300' : 'text-black/70'}`}>
                {selectedEvent.maybe_count || 0} maybe
              </span>
            </div>
            {spotsLeft !== null && (
              <div className={`text-sm ml-auto ${spotsLeft <= 3 ? 'text-red-500 font-semibold' : nightMode ? 'text-slate-300' : 'text-black/60'}`}>
                {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}
              </div>
            )}
          </div>

          {/* RSVP Buttons */}
          <div className="flex gap-2 mb-4">
            {(['going', 'maybe', 'not_going'] as RSVPStatus[]).map((status) => {
              const isActive = userRsvp === status;
              const labels: Record<RSVPStatus, string> = { going: 'Going', maybe: 'Maybe', not_going: "Can't Make It" };
              const icons: Record<RSVPStatus, React.ReactNode> = {
                going: <Check className="w-4 h-4" />,
                maybe: <HelpCircle className="w-4 h-4" />,
                not_going: <XCircle className="w-4 h-4" />,
              };
              const colors: Record<RSVPStatus, string> = {
                going: isActive ? 'bg-green-500 text-white border-green-500' : nightMode ? 'bg-white/5 text-slate-100 border-white/10 hover:bg-green-500/20' : 'bg-white/80 text-black border-white/30 hover:bg-green-50 shadow-sm',
                maybe: isActive ? 'bg-yellow-500 text-white border-yellow-500' : nightMode ? 'bg-white/5 text-slate-100 border-white/10 hover:bg-yellow-500/20' : 'bg-white/80 text-black border-white/30 hover:bg-yellow-50 shadow-sm',
                not_going: isActive ? 'bg-red-500 text-white border-red-500' : nightMode ? 'bg-white/5 text-slate-100 border-white/10 hover:bg-red-500/20' : 'bg-white/80 text-black border-white/30 hover:bg-red-50 shadow-sm',
              };

              return (
                <button
                  key={status}
                  onClick={() => handleRSVP(selectedEvent.id, status)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${colors[status]}`}
                >
                  {icons[status]}
                  {labels[status]}
                </button>
              );
            })}
          </div>

          {/* RSVP List */}
          {rsvpUsers.length > 0 && (
            <div>
              <h3 className={`text-sm font-semibold mb-2 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                Attendees
              </h3>
              <div className="space-y-1.5">
                {rsvpUsers.filter((r: any) => r.status === 'going').map((rsvp: any) => (
                  <div key={rsvp.id} className="flex items-center gap-2">
                    <span className="text-lg">{rsvp.user?.avatar_emoji}</span>
                    <span className={`text-sm ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                      {rsvp.user?.display_name}
                    </span>
                    <Check className="w-3.5 h-3.5 text-green-500 ml-auto" />
                  </div>
                ))}
                {rsvpUsers.filter((r: any) => r.status === 'maybe').map((rsvp: any) => (
                  <div key={rsvp.id} className="flex items-center gap-2">
                    <span className="text-lg">{rsvp.user?.avatar_emoji}</span>
                    <span className={`text-sm ${nightMode ? 'text-slate-300' : 'text-black/70'}`}>
                      {rsvp.user?.display_name}
                    </span>
                    <HelpCircle className="w-3.5 h-3.5 text-yellow-500 ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cancel button for creator */}
          {isCreator && (
            <button
              onClick={() => handleCancelEvent(selectedEvent.id)}
              className={`w-full mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                nightMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              Cancel Event
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // CREATE EVENT FORM
  // ==========================================
  if (showCreateForm) {
    return (
      <div className="py-4 px-4 space-y-4 pb-24">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => { setShowCreateForm(false); resetForm(); }} className="text-blue-600 text-sm font-semibold">
            ← Cancel
          </button>
          <h2 className={`text-lg font-bold ${nightMode ? 'text-slate-100' : 'text-black'}`}>Create Event</h2>
          <div className="w-16"></div>
        </div>

        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div
            className={`rounded-2xl border p-4 space-y-3.5 ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
            style={cardStyle}
          >
            {/* Title */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                Event Title *
              </label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Sunday Service" className={inputClass} required />
            </div>

            {/* Description */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                Description
              </label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this event about?" rows={2} className={inputClass} />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                  Start Date *
                </label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                  Start Time *
                </label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                  End Date
                </label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                  End Time
                </label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                Location
              </label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Main Sanctuary" className={inputClass} />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                Location Link (optional)
              </label>
              <input type="url" value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} placeholder="https://maps.google.com/..." className={inputClass} />
            </div>

            {/* Recurrence */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                Repeats
              </label>
              <div className="flex gap-2">
                {RECURRENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRecurrence(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      recurrence === opt.value
                        ? 'bg-blue-500 text-white border-blue-500'
                        : nightMode
                          ? 'bg-white/5 text-slate-100 border-white/10 hover:bg-white/10'
                          : 'bg-white/80 text-black border-white/30 hover:bg-white shadow-sm'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Capacity */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                Max Capacity (optional)
              </label>
              <input type="number" value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} placeholder="Leave empty for unlimited" className={inputClass} min="1" />
            </div>

            {/* Reminders */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                Reminders
              </label>
              <div className="flex gap-3">
                <label className={`flex items-center gap-2 text-sm ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                  <input type="checkbox" checked={reminder24h} onChange={(e) => setReminder24h(e.target.checked)} className="rounded" />
                  24 hours before
                </label>
                <label className={`flex items-center gap-2 text-sm ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                  <input type="checkbox" checked={reminder1h} onChange={(e) => setReminder1h(e.target.checked)} className="rounded" />
                  1 hour before
                </label>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !title.trim() || !startDate || !startTime}
            className={`w-full px-4 py-3 rounded-xl font-semibold transition-all duration-200 border text-white disabled:opacity-50 disabled:cursor-not-allowed ${nightMode ? 'border-white/20' : 'shadow-md border-white/30'}`}
            style={{
              background: 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
            }}
          >
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </form>
      </div>
    );
  }

  // ==========================================
  // CALENDAR VIEW
  // ==========================================
  const renderCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const getEventsForDay = (day: number) => {
      return events.filter((e) => {
        const eDate = new Date(e.start_time);
        return eDate.getFullYear() === year && eDate.getMonth() === month && eDate.getDate() === day;
      });
    };

    return (
      <div
        className={`rounded-2xl border p-4 ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
        style={cardStyle}
      >
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCalendarMonth(new Date(year, month - 1))}
            className={`p-1.5 rounded-lg ${nightMode ? 'hover:bg-white/10' : 'hover:bg-white/40'}`}
          >
            <ChevronLeft className={`w-4 h-4 ${nightMode ? 'text-slate-100' : 'text-black'}`} />
          </button>
          <h3 className={`text-sm font-bold ${nightMode ? 'text-slate-100' : 'text-black'}`}>
            {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={() => setCalendarMonth(new Date(year, month + 1))}
            className={`p-1.5 rounded-lg ${nightMode ? 'hover:bg-white/10' : 'hover:bg-white/40'}`}
          >
            <ChevronRight className={`w-4 h-4 ${nightMode ? 'text-slate-100' : 'text-black'}`} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className={`text-center text-[10px] font-semibold py-1 ${nightMode ? 'text-slate-400' : 'text-black/50'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const dayEvents = getEventsForDay(day);
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

            return (
              <button
                key={day}
                onClick={() => {
                  if (dayEvents.length > 0) openEventDetail(dayEvents[0]);
                }}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative transition-all ${
                  isToday
                    ? 'bg-blue-500 text-white font-bold'
                    : dayEvents.length > 0
                      ? nightMode
                        ? 'bg-blue-500/20 text-blue-400 font-semibold hover:bg-blue-500/30'
                        : 'bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100'
                      : nightMode
                        ? 'text-slate-300 hover:bg-white/5'
                        : 'text-black hover:bg-white/40'
                }`}
              >
                {day}
                {dayEvents.length > 0 && (
                  <div className={`w-1 h-1 rounded-full mt-0.5 ${isToday ? 'bg-white' : 'bg-blue-500'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ==========================================
  // EVENTS LIST VIEW (default)
  // ==========================================
  return (
    <div className="py-4 px-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-blue-600 text-sm font-semibold">
          ← Back
        </button>
        <h2 className={`text-lg font-bold ${nightMode ? 'text-slate-100' : 'text-black'}`}>Events</h2>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className={`flex rounded-lg border overflow-hidden ${nightMode ? 'border-white/10' : 'border-white/30'}`}>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : nightMode ? 'bg-white/5 text-slate-100' : 'bg-white/80 text-black'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-blue-500 text-white'
                  : nightMode ? 'bg-white/5 text-slate-100' : 'bg-white/80 text-black'
              }`}
            >
              Cal
            </button>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowCreateForm(true)}
              className={`p-1.5 border rounded-lg transition-all text-white ${nightMode ? 'border-white/20' : 'shadow-sm border-white/30'}`}
              style={{ background: 'rgba(79, 150, 255, 0.85)' }}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && renderCalendar()}

      {/* Events List */}
      {loading ? (
        <div className={`text-center py-8 ${nightMode ? 'text-slate-300' : 'text-black/60'}`}>
          Loading events...
        </div>
      ) : events.length === 0 ? (
        <div
          className={`rounded-2xl border p-8 text-center ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25'}`}
          style={cardStyle}
        >
          <div className="text-5xl mb-3">📅</div>
          <p className={`font-bold text-lg mb-1 ${nightMode ? 'text-slate-100' : 'text-black'}`}>No upcoming events</p>
          <p className={`text-sm ${nightMode ? 'text-slate-300' : 'text-black/60'}`}>
            {canCreate ? 'Create an event to get started!' : 'Check back later for upcoming events.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {events.map((event) => {
            const userRsvp = getUserRsvpStatus(event);
            const spotsLeft = event.max_capacity ? event.max_capacity - (event.going_count || 0) : null;

            return (
              <button
                key={event.id}
                onClick={() => openEventDetail(event)}
                className={`w-full rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 ${nightMode ? 'bg-white/5 border-white/10' : 'border-white/25 hover:shadow-lg'}`}
                style={cardStyle}
              >
                <div className="flex items-start gap-3">
                  {/* Date badge */}
                  <div className={`flex flex-col items-center justify-center min-w-[44px] rounded-xl px-2 py-1.5 ${
                    nightMode ? 'bg-blue-500/20' : 'bg-blue-50'
                  }`}>
                    <span className={`text-[10px] font-bold uppercase ${nightMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className={`text-lg font-bold leading-tight ${nightMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      {new Date(event.start_time).getDate()}
                    </span>
                  </div>

                  {/* Event info */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm mb-0.5 ${nightMode ? 'text-slate-100' : 'text-black'}`}>
                      {event.title}
                    </h3>
                    <p className={`text-xs ${nightMode ? 'text-slate-300' : 'text-black/60'}`}>
                      {formatEventTime(event.start_time)}
                      {event.location && ` · ${event.location}`}
                    </p>

                    {/* RSVP counts */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-xs ${nightMode ? 'text-slate-400' : 'text-black/50'}`}>
                        {event.going_count || 0} going
                      </span>
                      {spotsLeft !== null && spotsLeft <= 5 && (
                        <span className="text-xs text-red-500 font-semibold">
                          {spotsLeft > 0 ? `${spotsLeft} left` : 'Full'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* User RSVP indicator */}
                  {userRsvp && (
                    <div className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                      userRsvp === 'going'
                        ? 'bg-green-500/20 text-green-500'
                        : userRsvp === 'maybe'
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : 'bg-red-500/20 text-red-500'
                    }`}>
                      {userRsvp === 'going' ? 'Going' : userRsvp === 'maybe' ? 'Maybe' : 'Not going'}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventsView;
