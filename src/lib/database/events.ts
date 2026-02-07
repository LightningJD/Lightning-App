/**
 * Event System Database Operations
 *
 * Handles CRUD for group events, RSVP tracking, recurring events,
 * event-specific chat threads, and calendar queries.
 */

import { supabase } from '../supabase';
import type { GroupEvent, EventRSVP, EventRecurrence, RSVPStatus, EventWithDetails } from '../../types';

interface CreateEventData {
  groupId: string;
  creatorId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  locationUrl?: string;
  recurrence?: EventRecurrence;
  recurrenceEndDate?: string;
  maxCapacity?: number;
  reminder24h?: boolean;
  reminder1h?: boolean;
  customReminderMinutes?: number;
}

// ============================================
// EVENT CRUD
// ============================================

/**
 * Create a new event in a group
 */
export const createEvent = async (data: CreateEventData): Promise<GroupEvent | null> => {
  if (!supabase) return null;

  const eventData: any = {
    group_id: data.groupId,
    creator_id: data.creatorId,
    title: data.title,
    description: data.description || null,
    start_time: data.startTime,
    end_time: data.endTime || null,
    location: data.location || null,
    location_url: data.locationUrl || null,
    recurrence: data.recurrence || 'once',
    recurrence_end_date: data.recurrenceEndDate || null,
    max_capacity: data.maxCapacity || null,
    reminder_24h: data.reminder24h ?? true,
    reminder_1h: data.reminder1h ?? true,
    custom_reminder_minutes: data.customReminderMinutes || null,
    is_cancelled: false,
  };

  const { data: event, error } = await supabase
    .from('group_events')
    // @ts-ignore - Table may not exist yet in generated types
    .insert(eventData)
    .select()
    .single();

  if (error) {
    console.error('Error creating event:', error);
    return null;
  }

  // Auto-RSVP the creator as "going"
  if (event) {
    await rsvpToEvent((event as any).id, data.creatorId, 'going');
  }

  // Generate recurring instances if needed
  if (event && data.recurrence && data.recurrence !== 'once') {
    await generateRecurringInstances(event as any as GroupEvent);
  }

  return event as unknown as GroupEvent;
};

/**
 * Generate instances for a recurring event
 */
const generateRecurringInstances = async (parentEvent: GroupEvent): Promise<void> => {
  if (!supabase || parentEvent.recurrence === 'once') return;

  const startDate = new Date(parentEvent.start_time);
  const endDate = parentEvent.recurrence_end_date
    ? new Date(parentEvent.recurrence_end_date)
    : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days default

  const instances: any[] = [];
  let currentDate = new Date(startDate);

  // Skip the first one (it's the parent)
  advanceDate(currentDate, parentEvent.recurrence);

  while (currentDate <= endDate && instances.length < 52) {
    const duration = parentEvent.end_time
      ? new Date(parentEvent.end_time).getTime() - new Date(parentEvent.start_time).getTime()
      : 0;

    instances.push({
      group_id: parentEvent.group_id,
      creator_id: parentEvent.creator_id,
      title: parentEvent.title,
      description: parentEvent.description,
      start_time: currentDate.toISOString(),
      end_time: duration ? new Date(currentDate.getTime() + duration).toISOString() : null,
      location: parentEvent.location,
      location_url: parentEvent.location_url,
      recurrence: 'once',
      parent_event_id: parentEvent.id,
      max_capacity: parentEvent.max_capacity,
      reminder_24h: parentEvent.reminder_24h,
      reminder_1h: parentEvent.reminder_1h,
      custom_reminder_minutes: parentEvent.custom_reminder_minutes,
      is_cancelled: false,
    });

    advanceDate(currentDate, parentEvent.recurrence);
  }

  if (instances.length > 0) {
    const { error } = await supabase
      .from('group_events')
      // @ts-ignore
      .insert(instances);

    if (error) {
      console.error('Error generating recurring instances:', error);
    }
  }
};

/**
 * Advance a date by the recurrence interval
 */
const advanceDate = (date: Date, recurrence: EventRecurrence): void => {
  switch (recurrence) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
  }
};

/**
 * Get events for a group
 */
export const getGroupEvents = async (
  groupId: string,
  includeRSVPs: boolean = true
): Promise<EventWithDetails[]> => {
  if (!supabase) return [];

  let query = supabase
    .from('group_events')
    // @ts-ignore
    .select(includeRSVPs
      ? '*, creator:users!creator_id(display_name, avatar_emoji), rsvps:event_rsvps(*)'
      : '*, creator:users!creator_id(display_name, avatar_emoji)'
    )
    .eq('group_id', groupId)
    .eq('is_cancelled', false)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching group events:', error);
    return [];
  }

  return (data || []).map(enrichEventWithCounts) as unknown as EventWithDetails[];
};

/**
 * Get a single event by ID
 */
export const getEventById = async (eventId: string): Promise<EventWithDetails | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('group_events')
    // @ts-ignore
    .select('*, creator:users!creator_id(display_name, avatar_emoji), rsvps:event_rsvps(*)')
    .eq('id', eventId)
    .single();

  if (error) {
    console.error('Error fetching event:', error);
    return null;
  }

  return enrichEventWithCounts(data) as unknown as EventWithDetails;
};

/**
 * Enrich event with RSVP counts
 */
const enrichEventWithCounts = (event: any): any => {
  const rsvps = event.rsvps || [];
  return {
    ...event,
    going_count: rsvps.filter((r: any) => r.status === 'going').length,
    maybe_count: rsvps.filter((r: any) => r.status === 'maybe').length,
    not_going_count: rsvps.filter((r: any) => r.status === 'not_going').length,
  };
};

/**
 * Update an event
 */
export const updateEvent = async (
  eventId: string,
  updates: Partial<Omit<GroupEvent, 'id' | 'group_id' | 'creator_id' | 'created_at'>>
): Promise<GroupEvent | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('group_events')
    // @ts-ignore
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    console.error('Error updating event:', error);
    return null;
  }

  return data as unknown as GroupEvent;
};

/**
 * Cancel an event (soft delete)
 */
export const cancelEvent = async (eventId: string): Promise<boolean> => {
  if (!supabase) return false;

  const { error } = await supabase
    .from('group_events')
    // @ts-ignore
    .update({ is_cancelled: true, updated_at: new Date().toISOString() })
    .eq('id', eventId);

  if (error) {
    console.error('Error cancelling event:', error);
    return false;
  }

  return true;
};

/**
 * Delete an event and its recurring instances
 */
export const deleteEvent = async (eventId: string, deleteRecurring: boolean = false): Promise<boolean> => {
  if (!supabase) return false;

  // Delete RSVPs first
  await supabase.from('event_rsvps').delete().eq('event_id', eventId);

  if (deleteRecurring) {
    // Delete all child instances
    const { data: children } = await supabase
      .from('group_events')
      // @ts-ignore
      .select('id')
      .eq('parent_event_id', eventId);

    if (children) {
      for (const child of children) {
        await supabase.from('event_rsvps').delete().eq('event_id', (child as any).id);
      }
      await supabase.from('group_events').delete().eq('parent_event_id', eventId);
    }
  }

  const { error } = await supabase
    .from('group_events')
    .delete()
    .eq('id', eventId);

  if (error) {
    console.error('Error deleting event:', error);
    return false;
  }

  return true;
};

// ============================================
// RSVP OPERATIONS
// ============================================

/**
 * RSVP to an event
 */
export const rsvpToEvent = async (
  eventId: string,
  userId: string,
  status: RSVPStatus
): Promise<EventRSVP | null> => {
  if (!supabase) return null;

  // Check capacity before accepting 'going' RSVP
  if (status === 'going') {
    const event = await getEventById(eventId);
    if (event && event.max_capacity) {
      const goingCount = event.going_count || 0;
      if (goingCount >= event.max_capacity) {
        console.error('Event is at full capacity');
        return null;
      }
    }
  }

  // Upsert RSVP (update if exists, insert if not)
  const { data, error } = await supabase
    .from('event_rsvps')
    // @ts-ignore
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,user_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error RSVPing to event:', error);
    return null;
  }

  return data as unknown as EventRSVP;
};

/**
 * Remove RSVP from an event
 */
export const removeRSVP = async (eventId: string, userId: string): Promise<boolean> => {
  if (!supabase) return false;

  const { error } = await supabase
    .from('event_rsvps')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing RSVP:', error);
    return false;
  }

  return true;
};

/**
 * Get RSVPs for an event with user details
 */
export const getEventRSVPs = async (eventId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('event_rsvps')
    // @ts-ignore
    .select('*, user:users!user_id(id, display_name, username, avatar_emoji)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching RSVPs:', error);
    return [];
  }

  return data || [];
};

/**
 * Get user's RSVP status for an event
 */
export const getUserRSVP = async (eventId: string, userId: string): Promise<RSVPStatus | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('event_rsvps')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    console.error('Error fetching user RSVP:', error);
    return null;
  }

  return (data as any)?.status || null;
};

// ============================================
// EVENT CHAT (uses group_messages with event_id)
// ============================================

/**
 * Send a message in an event's chat thread
 */
export const sendEventMessage = async (
  eventId: string,
  groupId: string,
  senderId: string,
  content: string
): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('group_messages')
    // @ts-ignore
    .insert({
      group_id: groupId,
      sender_id: senderId,
      content,
      message_type: 'event_chat',
      event_id: eventId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending event message:', error);
    return null;
  }

  return data;
};

/**
 * Get messages for an event's chat thread
 */
export const getEventMessages = async (eventId: string, limit: number = 100): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('group_messages')
    // @ts-ignore
    .select('*, sender:users!sender_id(username, display_name, avatar_emoji)')
    .eq('event_id', eventId)
    .eq('message_type', 'event_chat')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching event messages:', error);
    return [];
  }

  return data || [];
};

// ============================================
// CALENDAR QUERIES
// ============================================

/**
 * Get events across all user's groups for a date range (calendar view)
 */
export const getUserCalendarEvents = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<EventWithDetails[]> => {
  if (!supabase) return [];

  // First get user's group IDs
  const { data: memberships, error: memberError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);

  if (memberError || !memberships || memberships.length === 0) {
    return [];
  }

  const groupIds = memberships.map((m: any) => m.group_id);

  // Then get events from those groups
  const { data, error } = await supabase
    .from('group_events')
    // @ts-ignore
    .select('*, creator:users!creator_id(display_name, avatar_emoji), rsvps:event_rsvps(*), group:groups!group_id(name, avatar_emoji)')
    .in('group_id', groupIds)
    .eq('is_cancelled', false)
    .gte('start_time', startDate)
    .lte('start_time', endDate)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }

  return (data || []).map(enrichEventWithCounts) as unknown as EventWithDetails[];
};

/**
 * Get upcoming events for a user (next 7 days, across all groups)
 */
export const getUpcomingEvents = async (userId: string, days: number = 7): Promise<EventWithDetails[]> => {
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return getUserCalendarEvents(userId, now.toISOString(), end.toISOString());
};

// ============================================
// REMINDER HELPERS
// ============================================

/**
 * Get events that need reminders sent
 * (Used by a background job or effect)
 */
export const getEventsNeedingReminders = async (
  userId: string
): Promise<{ event: EventWithDetails; reminderType: '24h' | '1h' | 'custom' }[]> => {
  if (!supabase) return [];

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);

  // Get user's events they've RSVP'd 'going' or 'maybe'
  const { data: rsvps } = await supabase
    .from('event_rsvps')
    .select('event_id')
    .eq('user_id', userId)
    .in('status', ['going', 'maybe']);

  if (!rsvps || rsvps.length === 0) return [];

  const eventIds = rsvps.map((r: any) => r.event_id);

  const { data: events } = await supabase
    .from('group_events')
    // @ts-ignore
    .select('*, creator:users!creator_id(display_name, avatar_emoji)')
    .in('id', eventIds)
    .eq('is_cancelled', false)
    .gte('start_time', now.toISOString())
    .lte('start_time', in24h.toISOString());

  if (!events) return [];

  const reminders: { event: EventWithDetails; reminderType: '24h' | '1h' | 'custom' }[] = [];

  for (const event of events) {
    const startTime = new Date((event as any).start_time);
    const hoursUntil = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if ((event as any).reminder_24h && hoursUntil <= 24 && hoursUntil > 23) {
      reminders.push({ event: event as unknown as EventWithDetails, reminderType: '24h' });
    }
    if ((event as any).reminder_1h && hoursUntil <= 1 && hoursUntil > 0.5) {
      reminders.push({ event: event as unknown as EventWithDetails, reminderType: '1h' });
    }
  }

  return reminders;
};
