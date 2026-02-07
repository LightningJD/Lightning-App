/**
 * Church Management Functions
 * Handles church CRUD, invite codes, and membership
 */

import { supabase } from '../supabase';

// ============================================
// INVITE CODE GENERATION
// ============================================

function generateChurchInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================
// CHURCH OPERATIONS
// ============================================

/**
 * Create a new church and set the creator as a member
 */
export const createChurch = async (
  name: string,
  createdBy: string,
  location?: string,
  denomination?: string
): Promise<any> => {
  if (!supabase) return null;

  const inviteCode = generateChurchInviteCode();

  const { data: church, error } = await (supabase as any)
    .from('churches')
    .insert({
      name,
      location: location || null,
      denomination: denomination || null,
      invite_code: inviteCode,
      created_by: createdBy,
      member_count: 1
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating church:', error);
    return null;
  }

  // Set creator's church_id
  const { error: updateError } = await supabase
    .from('users')
    // @ts-ignore - dynamic update
    .update({ church_id: church.id })
    .eq('id', createdBy);

  if (updateError) {
    console.error('Error setting creator church_id:', updateError);
  }

  return church;
};

/**
 * Join a church by invite code
 */
export const joinChurchByCode = async (code: string, userId: string): Promise<{ success: boolean; church?: any; error?: string }> => {
  if (!supabase) return { success: false, error: 'Database not initialized' };

  // Find church by invite code
  const { data: church, error: findError } = await (supabase as any)
    .from('churches')
    .select('*')
    .eq('invite_code', code.trim())
    .single();

  if (findError || !church) {
    return { success: false, error: 'Invalid invite code' };
  }

  // Check if user already in this church
  const { data: currentUser } = await supabase
    .from('users')
    .select('church_id')
    .eq('id', userId)
    .single();

  if ((currentUser as any)?.church_id === church.id) {
    return { success: false, error: 'You are already a member of this church' };
  }

  // If user is in another church, leave it first
  if ((currentUser as any)?.church_id) {
    await leaveChurch(userId);
  }

  // Set user's church_id
  const { error: updateError } = await supabase
    .from('users')
    // @ts-ignore - dynamic update
    .update({ church_id: church.id })
    .eq('id', userId);

  if (updateError) {
    console.error('Error joining church:', updateError);
    return { success: false, error: 'Failed to join church' };
  }

  // Increment member count using RPC or raw update to avoid race conditions
  await (supabase as any).rpc('increment_member_count', { church_id_input: church.id }).catch(() => {
    // Fallback: non-atomic increment if RPC doesn't exist
    (supabase as any)
      .from('churches')
      .update({ member_count: (church.member_count || 0) + 1 })
      .eq('id', church.id);
  });

  return { success: true, church };
};

/**
 * Get church by ID
 */
export const getChurchById = async (churchId: string): Promise<any> => {
  if (!supabase) return null;

  const { data, error } = await (supabase as any)
    .from('churches')
    .select('*')
    .eq('id', churchId)
    .single();

  if (error) {
    console.error('Error fetching church:', error);
    return null;
  }

  return data;
};

/**
 * Get church members (users with this church_id)
 */
export const getChurchMembers = async (churchId: string): Promise<any[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_emoji, avatar_url, is_online, bio, location_city')
    .eq('church_id' as any, churchId);

  if (error) {
    console.error('Error fetching church members:', error);
    return [];
  }

  return data || [];
};

/**
 * Leave current church
 */
export const leaveChurch = async (userId: string): Promise<boolean> => {
  if (!supabase) return false;

  // Get current church to decrement count
  const { data: user } = await supabase
    .from('users')
    .select('church_id')
    .eq('id', userId)
    .single();

  const churchId = (user as any)?.church_id;
  if (!churchId) return true; // Not in a church

  // Clear church_id
  const { error } = await supabase
    .from('users')
    // @ts-ignore - dynamic update
    .update({ church_id: null })
    .eq('id', userId);

  if (error) {
    console.error('Error leaving church:', error);
    return false;
  }

  // Decrement member count using RPC or raw update to avoid race conditions
  await (supabase as any).rpc('decrement_member_count', { church_id_input: churchId }).catch(async () => {
    // Fallback: non-atomic decrement if RPC doesn't exist
    const { data: church } = await (supabase as any)
      .from('churches')
      .select('member_count')
      .eq('id', churchId)
      .single();

    if (church) {
      await (supabase as any)
        .from('churches')
        .update({ member_count: Math.max(0, (church.member_count || 1) - 1) })
        .eq('id', churchId);
    }
  });

  return true;
};

/**
 * Regenerate invite code (creator only)
 */
export const regenerateInviteCode = async (churchId: string, userId: string): Promise<string | null> => {
  if (!supabase) return null;

  // Verify user is the creator
  const { data: church } = await (supabase as any)
    .from('churches')
    .select('created_by')
    .eq('id', churchId)
    .single();

  if (!church || church.created_by !== userId) {
    console.warn('Only the church creator can regenerate the invite code');
    return null;
  }

  const newCode = generateChurchInviteCode();

  const { error } = await (supabase as any)
    .from('churches')
    .update({ invite_code: newCode, updated_at: new Date().toISOString() })
    .eq('id', churchId);

  if (error) {
    console.error('Error regenerating invite code:', error);
    return null;
  }

  return newCode;
};

/**
 * Get church for a user (includes church details)
 */
export const getUserChurch = async (userId: string): Promise<any> => {
  if (!supabase) return null;

  const { data: user } = await supabase
    .from('users')
    .select('church_id')
    .eq('id', userId)
    .single();

  const churchId = (user as any)?.church_id;
  if (!churchId) return null;

  return getChurchById(churchId);
};

/**
 * Update church details (creator only)
 */
export const updateChurch = async (
  churchId: string,
  userId: string,
  updates: { name?: string; location?: string; denomination?: string }
): Promise<any> => {
  if (!supabase) return null;

  // Verify user is the creator
  const { data: church } = await (supabase as any)
    .from('churches')
    .select('created_by')
    .eq('id', churchId)
    .single();

  if (!church || church.created_by !== userId) {
    console.warn('Only the church creator can update church details');
    return null;
  }

  const { data, error } = await (supabase as any)
    .from('churches')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', churchId)
    .select()
    .single();

  if (error) {
    console.error('Error updating church:', error);
    return null;
  }

  return data;
};
