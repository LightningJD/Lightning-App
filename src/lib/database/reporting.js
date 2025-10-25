import { supabase } from '../supabase';

/**
 * Report a user
 * @param {string} reporterId - The ID of the user making the report (current user)
 * @param {string} reportedUserId - The ID of the user being reported
 * @param {string} reason - Reason for reporting (from predefined list)
 * @param {string} details - Additional details from the reporter
 * @returns {Promise<Object>} The created report
 */
export const reportUser = async (reporterId, reportedUserId, reason, details = '') => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        report_type: 'user',
        reason: reason,
        details: details,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error reporting user:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in reportUser:', error);
    throw error;
  }
};

/**
 * Report a testimony
 * @param {string} reporterId - The ID of the user making the report
 * @param {string} testimonyId - The ID of the testimony being reported
 * @param {string} testimonyOwnerId - The ID of the user who owns the testimony
 * @param {string} reason - Reason for reporting
 * @param {string} details - Additional details
 * @returns {Promise<Object>} The created report
 */
export const reportTestimony = async (reporterId, testimonyId, testimonyOwnerId, reason, details = '') => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: reporterId,
        reported_user_id: testimonyOwnerId,
        reported_testimony_id: testimonyId,
        report_type: 'testimony',
        reason: reason,
        details: details,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error reporting testimony:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in reportTestimony:', error);
    throw error;
  }
};

/**
 * Report a message
 * @param {string} reporterId - The ID of the user making the report
 * @param {string} messageId - The ID of the message being reported
 * @param {string} messageAuthorId - The ID of the message author
 * @param {string} reason - Reason for reporting
 * @param {string} details - Additional details
 * @returns {Promise<Object>} The created report
 */
export const reportMessage = async (reporterId, messageId, messageAuthorId, reason, details = '') => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: reporterId,
        reported_user_id: messageAuthorId,
        reported_message_id: messageId,
        report_type: 'message',
        reason: reason,
        details: details,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error reporting message:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in reportMessage:', error);
    throw error;
  }
};

/**
 * Report a group
 * @param {string} reporterId - The ID of the user making the report
 * @param {string} groupId - The ID of the group being reported
 * @param {string} groupOwnerId - The ID of the group owner/creator
 * @param {string} reason - Reason for reporting
 * @param {string} details - Additional details
 * @returns {Promise<Object>} The created report
 */
export const reportGroup = async (reporterId, groupId, groupOwnerId, reason, details = '') => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: reporterId,
        reported_user_id: groupOwnerId,
        report_type: 'group',
        reason: reason,
        details: details,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error reporting group:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in reportGroup:', error);
    throw error;
  }
};

/**
 * Get all reports made by a user (to prevent spam)
 * @param {string} reporterId - The ID of the user
 * @returns {Promise<Array>} Array of reports
 */
export const getReportsByUser = async (reporterId) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', reporterId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user reports:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getReportsByUser:', error);
    throw error;
  }
};

/**
 * Check if user has already reported this content
 * @param {string} reporterId - The ID of the user
 * @param {string} reportType - Type of content ('user', 'testimony', 'message', 'group')
 * @param {string} contentId - ID of the content (user ID, testimony ID, etc.)
 * @returns {Promise<boolean>} True if already reported, false otherwise
 */
export const hasUserReported = async (reporterId, reportType, contentId) => {
  try {
    let query = supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', reporterId)
      .eq('report_type', reportType);

    // Add appropriate content ID filter based on type
    if (reportType === 'user') {
      query = query.eq('reported_user_id', contentId);
    } else if (reportType === 'testimony') {
      query = query.eq('reported_testimony_id', contentId);
    } else if (reportType === 'message') {
      query = query.eq('reported_message_id', contentId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error checking if user has reported:', error);
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error in hasUserReported:', error);
    return false;
  }
};

/**
 * Predefined report reasons
 */
export const REPORT_REASONS = {
  user: [
    { value: 'harassment', label: 'Harassment or Bullying' },
    { value: 'spam', label: 'Spam or Scam' },
    { value: 'impersonation', label: 'Impersonation' },
    { value: 'inappropriate_content', label: 'Inappropriate Content' },
    { value: 'hate_speech', label: 'Hate Speech' },
    { value: 'other', label: 'Other' }
  ],
  testimony: [
    { value: 'inappropriate_content', label: 'Inappropriate Content' },
    { value: 'false_information', label: 'False or Misleading Information' },
    { value: 'hate_speech', label: 'Hate Speech' },
    { value: 'spam', label: 'Spam' },
    { value: 'offensive', label: 'Offensive or Disrespectful' },
    { value: 'other', label: 'Other' }
  ],
  message: [
    { value: 'harassment', label: 'Harassment or Bullying' },
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate_content', label: 'Inappropriate Content' },
    { value: 'threats', label: 'Threats or Violence' },
    { value: 'hate_speech', label: 'Hate Speech' },
    { value: 'other', label: 'Other' }
  ],
  group: [
    { value: 'inappropriate_content', label: 'Inappropriate Content' },
    { value: 'hate_speech', label: 'Hate Speech or Extremism' },
    { value: 'spam', label: 'Spam or Scam' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'false_purpose', label: 'Misrepresents Purpose' },
    { value: 'other', label: 'Other' }
  ]
};
