import { supabase } from '../supabase';
import { checkAndConfirmReferral } from './referrals';

interface TestimonyData {
  title?: string;
  content: string;
  lesson?: string;
  question1?: string;
  question2?: string;
  question3?: string;
  question4?: string;
  isPublic?: boolean;
  visibility?: 'my_church' | 'all_churches' | 'shareable';
  musicSpotifyUrl?: string;
  musicTrackName?: string;
  musicArtist?: string;
  musicAudioUrl?: string;
}

// ============================================
// TESTIMONY OPERATIONS
// ============================================

/**
 * Create a new testimony
 */
export const createTestimony = async (userId: string, testimonyData: TestimonyData): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('testimonies')
    .upsert({
      user_id: userId,
      title: testimonyData.title || 'My Testimony',
      content: testimonyData.content,
      lesson: testimonyData.lesson,
      question1_answer: testimonyData.question1,
      question2_answer: testimonyData.question2,
      question3_answer: testimonyData.question3,
      question4_answer: testimonyData.question4,
      word_count: testimonyData.content.trim().split(/\s+/).filter(Boolean).length,
      is_public: testimonyData.isPublic ?? true,
      visibility: testimonyData.visibility ?? 'my_church',
      music_spotify_url: testimonyData.musicSpotifyUrl,
      music_track_name: testimonyData.musicTrackName,
      music_artist: testimonyData.musicArtist,
      music_audio_url: testimonyData.musicAudioUrl,
      updated_at: new Date().toISOString()
    } as any, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    console.error('Error creating testimony:', error);
    return null;
  }

  // Update user's has_testimony flag
  await supabase
    .from('users')
    // @ts-ignore - Supabase generated types don't allow update on this table
    .update({ has_testimony: true })
    .eq('id', userId);

  // Check if this completes a pending referral (profile + testimony = confirmed)
  try {
    await checkAndConfirmReferral(userId);
  } catch (err) {
    console.error('Error checking referral confirmation:', err);
  }

  return data;
};

/**
 * Get testimony by user ID
 */
export const getTestimonyByUserId = async (userId: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('testimonies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching testimony:', error);
    return null;
  }

  return data;
};

/**
 * Update testimony
 * @param testimonyId - ID of testimony to update
 * @param userId - ID of user making the update (for authorization)
 * @param updates - Fields to update
 */
export const updateTestimony = async (
  testimonyId: string,
  userId: string,
  updates: Record<string, any>
): Promise<any> => {
  if (!supabase) return null;

  // First verify the testimony belongs to this user
  const { data: testimony } = await supabase
    .from('testimonies')
    .select('user_id')
    .eq('id', testimonyId)
    .single();

  if (!testimony || (testimony as any).user_id !== userId) {
    console.warn(`Unauthorized testimony update attempt: testimony=${testimonyId}, user=${userId}`);
    throw new Error('Unauthorized: You can only update your own testimonies');
  }

  const { data, error } = await supabase
    .from('testimonies')
    // @ts-ignore - Supabase generated types don't allow dynamic updates
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', testimonyId)
    .eq('user_id', userId) // Double-check authorization in query
    .select()
    .single();

  if (error) {
    console.error('Error updating testimony:', error);
    return null;
  }

  return data;
};

// ============================================
// TESTIMONY ANALYTICS FUNCTIONS
// ============================================

/**
 * Track testimony view (one per user per testimony)
 */
export const trackTestimonyView = async (testimonyId: string, viewerId: string): Promise<{ success: boolean; error?: string; alreadyViewed?: boolean }> => {
  if (!supabase) return { success: false, error: 'Database not initialized' };

  try {
    const { error } = await supabase
      .from('testimony_views')
      // @ts-ignore - Supabase generated types are incomplete
      .insert({
        testimony_id: testimonyId,
        viewer_id: viewerId
      });

    if (error) {
      // Ignore duplicate view errors (already viewed) - this is expected behavior
      // Error code 23505 is PostgreSQL unique violation (duplicate key)
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        return { success: true, alreadyViewed: true };
      }
      throw error;
    }

    return { success: true, alreadyViewed: false };
  } catch (error) {
    // Don't log duplicate view errors - they're expected
    if (error instanceof Error && !error.message.includes('23505') && !error.message.includes('duplicate')) {
      console.error('Error tracking testimony view:', error);
    }
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Get testimony view count
 */
export const getTestimonyViewCount = async (testimonyId: string): Promise<{ count: number }> => {
  if (!supabase) return { count: 0 };

  try {
    const { data, error } = await supabase
      .from('testimony_views')
      .select('id', { count: 'exact' })
      .eq('testimony_id', testimonyId);

    if (error) throw error;

    return { count: data?.length || 0 };
  } catch (error) {
    console.error('Error getting view count:', error);
    return { count: 0 };
  }
};

/**
 * Toggle testimony like/heart
 */
export const toggleTestimonyLike = async (testimonyId: string, userId: string): Promise<{ success: boolean; error?: string; liked?: boolean }> => {
  if (!supabase) return { success: false, error: 'Database not initialized' };

  try {
    // Check if already liked - use array query to avoid 406 errors from duplicates
    const { data: existingLikes } = await supabase
      .from('testimony_likes')
      .select('id')
      .eq('testimony_id', testimonyId)
      .eq('user_id', userId);

    if (existingLikes && existingLikes.length > 0) {
      const existing = existingLikes[0];
      // Unlike - remove the like
      const { error } = await supabase
        .from('testimony_likes')
        .delete()
        .eq('id', (existing as any).id);

      if (error) throw error;
      return { success: true, liked: false };
    } else {
      // Like - add new like
      const { error } = await supabase
        .from('testimony_likes')
        // @ts-ignore - Supabase generated types are incomplete
        .insert({
          testimony_id: testimonyId,
          user_id: userId
        });

      if (error) throw error;
      return { success: true, liked: true };
    }
  } catch (error) {
    console.error('Error toggling testimony like:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Check if user liked a testimony
 */
export const hasUserLikedTestimony = async (testimonyId: string, userId: string): Promise<{ liked: boolean }> => {
  if (!supabase) return { liked: false };

  try {
    // Use array query to avoid 406 errors from duplicates
    const { data, error } = await supabase
      .from('testimony_likes')
      .select('id')
      .eq('testimony_id', testimonyId)
      .eq('user_id', userId);

    if (error) throw error;

    return { liked: data && data.length > 0 };
  } catch (error) {
    console.error('Error checking testimony like:', error);
    return { liked: false };
  }
};

/**
 * Get testimony like count
 */
export const getTestimonyLikeCount = async (testimonyId: string): Promise<{ count: number }> => {
  if (!supabase) return { count: 0 };

  try {
    const { data, error } = await supabase
      .from('testimony_likes')
      .select('id', { count: 'exact' })
      .eq('testimony_id', testimonyId);

    if (error) throw error;

    return { count: data?.length || 0 };
  } catch (error) {
    console.error('Error getting like count:', error);
    return { count: 0 };
  }
};

/**
 * Add comment to testimony
 */
export const addTestimonyComment = async (testimonyId: string, userId: string, content: string): Promise<{ success: boolean; error?: string; comment?: any }> => {
  if (!supabase) return { success: false, error: 'Database not initialized' };

  try {
    const { data, error } = await supabase
      .from('testimony_comments')
      // @ts-ignore - Supabase generated types are incomplete
      .insert({
        testimony_id: testimonyId,
        user_id: userId,
        content: content.trim()
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, comment: data };
  } catch (error) {
    console.error('Error adding testimony comment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Get testimony comments
 */
export const getTestimonyComments = async (testimonyId: string): Promise<{ comments: any[] }> => {
  if (!supabase) return { comments: [] };

  try {
    const { data, error } = await supabase
      .from('testimony_comments')
      // @ts-ignore - Supabase generated types don't handle nested relations
      .select(`
        id,
        content,
        created_at,
        user_id,
        users:user_id (
          username,
          display_name,
          avatar_emoji,
          avatar_url
        )
      `)
      .eq('testimony_id', testimonyId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { comments: data || [] };
  } catch (error) {
    console.error('Error getting testimony comments:', error);
    return { comments: [] };
  }
};

/**
 * Delete a testimony (owner only)
 */
export const deleteTestimony = async (testimonyId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Database not initialized' };

  try {
    const { error } = await supabase
      .from('testimonies')
      .delete()
      .eq('id', testimonyId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting testimony:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Delete testimony comment
 */
export const deleteTestimonyComment = async (commentId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Database not initialized' };

  try {
    const { error } = await supabase
      .from('testimony_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting testimony comment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Get public testimonies for browsing (with user info)
 * @deprecated Use getDiscoverTestimonies instead
 */
export const getPublicTestimonies = async (limit: number = 20, offset: number = 0): Promise<any[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('testimonies')
      .select(`
        id,
        user_id,
        title,
        content,
        lesson,
        view_count,
        like_count,
        created_at,
        updated_at,
        users:user_id (
          id,
          username,
          display_name,
          avatar_emoji,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching public testimonies:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching public testimonies:', error);
    return [];
  }
};

// ============================================
// CHURCH-BASED FEED QUERIES
// ============================================

const TESTIMONY_SELECT_WITH_USER = `
  id,
  user_id,
  title,
  content,
  lesson,
  view_count,
  like_count,
  visibility,
  created_at,
  updated_at,
  users:user_id (
    id,
    username,
    display_name,
    avatar_emoji,
    avatar_url,
    church_id
  )
`;

/**
 * Get discover feed — testimonies visible platform-wide
 * Shows 'all_churches' and 'shareable' visibility
 */
export const getDiscoverTestimonies = async (limit: number = 20, offset: number = 0): Promise<any[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await (supabase as any)
      .from('testimonies')
      .select(TESTIMONY_SELECT_WITH_USER)
      .in('visibility', ['all_churches', 'shareable'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching discover testimonies:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching discover testimonies:', error);
    return [];
  }
};

/**
 * Get church testimonies — all testimonies from users in the same church
 */
export const getChurchTestimonies = async (churchId: string, limit: number = 20, offset: number = 0): Promise<any[]> => {
  if (!supabase) return [];

  try {
    // Get all users in this church
    const { data: churchUsers, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('church_id' as any, churchId);

    if (usersError || !churchUsers?.length) return [];

    const churchUserIds = (churchUsers as any[]).map((u: any) => u.id);

    // Get their testimonies (all visibility levels since same church)
    const { data, error } = await (supabase as any)
      .from('testimonies')
      .select(TESTIMONY_SELECT_WITH_USER)
      .in('user_id', churchUserIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching church testimonies:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching church testimonies:', error);
    return [];
  }
};

/**
 * Get main feed testimonies — church testimonies + friends' cross-church testimonies
 * @param userId - Current user's ID
 * @param churchId - Current user's church ID (null if no church)
 * @param friendIds - Array of friend user IDs
 */
export const getFeedTestimonies = async (
  userId: string,
  churchId: string | null,
  friendIds: string[],
  limit: number = 20,
  offset: number = 0
): Promise<any[]> => {
  if (!supabase) return [];

  try {
    // Strategy: fetch church testimonies + friend testimonies separately, merge & sort
    const results: any[] = [];

    // 1. Church testimonies (all visibility levels for same-church users)
    if (churchId) {
      const { data: churchUsers } = await supabase
        .from('users')
        .select('id')
        .eq('church_id' as any, churchId);

      if (churchUsers?.length) {
        const churchUserIds = (churchUsers as any[]).map((u: any) => u.id);
        const { data: churchTestimonies } = await (supabase as any)
          .from('testimonies')
          .select(TESTIMONY_SELECT_WITH_USER)
          .in('user_id', churchUserIds)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (churchTestimonies) results.push(...churchTestimonies);
      }
    }

    // 2. Friends' testimonies from OTHER churches (only 'all_churches' and 'shareable')
    const crossChurchFriends = friendIds.filter(fid => fid !== userId);
    if (crossChurchFriends.length > 0) {
      // Get friend testimonies that are visible cross-church
      const { data: friendTestimonies } = await (supabase as any)
        .from('testimonies')
        .select(TESTIMONY_SELECT_WITH_USER)
        .in('user_id', crossChurchFriends)
        .in('visibility', ['all_churches', 'shareable'])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (friendTestimonies) results.push(...friendTestimonies);
    }

    // 3. Own testimony (always visible)
    const { data: ownTestimony } = await (supabase as any)
      .from('testimonies')
      .select(TESTIMONY_SELECT_WITH_USER)
      .eq('user_id', userId)
      .limit(1);

    if (ownTestimony) results.push(...ownTestimony);

    // Deduplicate by testimony id and sort by created_at desc
    const uniqueMap = new Map<string, any>();
    for (const t of results) {
      if (!uniqueMap.has(t.id)) {
        uniqueMap.set(t.id, t);
      }
    }

    const sorted = Array.from(uniqueMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Apply pagination
    return sorted.slice(offset, offset + limit);
  } catch (error) {
    console.error('Error fetching feed testimonies:', error);
    return [];
  }
};

/**
 * Get trending testimony for a church — most liked in the past 7 days
 * Returns a single testimony or null if none qualify
 */
export const getTrendingTestimony = async (churchId: string | null): Promise<any | null> => {
  if (!supabase || !churchId) return null;

  try {
    // Get church member IDs
    const { data: churchUsers, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('church_id' as any, churchId);

    if (usersError || !churchUsers?.length) return null;
    const churchUserIds = (churchUsers as any[]).map((u: any) => u.id);

    // Get most-liked testimony from the past 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await (supabase as any)
      .from('testimonies')
      .select(TESTIMONY_SELECT_WITH_USER)
      .in('user_id', churchUserIds)
      .gte('created_at', oneWeekAgo)
      .gt('like_count', 0)
      .order('like_count', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
};
