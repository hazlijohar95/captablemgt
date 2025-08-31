import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export interface IActivityItem {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  activityType: 
    | 'user_joined' 
    | 'user_left' 
    | 'content_change' 
    | 'comment_add' 
    | 'comment_reply'
    | 'file_lock' 
    | 'file_unlock'
    | 'conflict_detected'
    | 'conflict_resolved'
    | 'approval_requested'
    | 'approval_granted'
    | 'approval_rejected';
  activityData: any;
  createdAt: Date;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any>;
}

export interface INotification {
  id: string;
  userId: string;
  type: 'activity' | 'mention' | 'approval' | 'conflict' | 'system';
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionText?: string;
}

export interface IActivityFeedFilter {
  sessionId?: string;
  userId?: string;
  activityTypes?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface INotificationFilter {
  userId: string;
  types?: string[];
  isRead?: boolean;
  priority?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class ActivityFeedService {
  private supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  );

  private listeners: Map<string, (activities: IActivityItem[]) => void> = new Map();
  private notificationListeners: Map<string, (notifications: INotification[]) => void> = new Map();

  constructor() {
    this.initializeRealtimeSubscriptions();
  }

  /**
   * Initialize real-time subscriptions for activities and notifications
   */
  private initializeRealtimeSubscriptions() {
    // Subscribe to activity changes
    this.supabase
      .channel('collaboration_activities')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'collaboration_activities'
        },
        (payload) => {
          this.handleActivityUpdate(payload.new as any);
        }
      )
      .subscribe();

    // Subscribe to notification changes
    this.supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          this.handleNotificationUpdate(payload);
        }
      )
      .subscribe();
  }

  /**
   * Create activity item
   */
  async createActivity(activity: Omit<IActivityItem, 'id' | 'createdAt'>): Promise<IActivityItem> {
    const activityItem: IActivityItem = {
      ...activity,
      id: uuidv4(),
      createdAt: new Date()
    };

    // Save to database
    const { error } = await this.supabase
      .from('collaboration_activities')
      .insert({
        id: activityItem.id,
        session_id: activityItem.sessionId,
        user_id: activityItem.userId,
        user_name: activityItem.userName,
        user_avatar: activityItem.userAvatar,
        activity_type: activityItem.activityType,
        activity_data: activityItem.activityData,
        resource_type: activityItem.resourceType,
        resource_id: activityItem.resourceId,
        metadata: activityItem.metadata,
        created_at: activityItem.createdAt.toISOString()
      });

    if (error) {
      throw new Error(`Failed to create activity: ${error.message}`);
    }

    // Generate related notifications
    await this.generateNotificationsFromActivity(activityItem);

    return activityItem;
  }

  /**
   * Get activity feed
   */
  async getActivityFeed(filter: IActivityFeedFilter): Promise<{
    activities: IActivityItem[];
    totalCount: number;
    hasMore: boolean;
  }> {
    let query = this.supabase
      .from('collaboration_activities')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filter.sessionId) {
      query = query.eq('session_id', filter.sessionId);
    }

    if (filter.userId) {
      query = query.eq('user_id', filter.userId);
    }

    if (filter.activityTypes && filter.activityTypes.length > 0) {
      query = query.in('activity_type', filter.activityTypes);
    }

    if (filter.startDate) {
      query = query.gte('created_at', filter.startDate.toISOString());
    }

    if (filter.endDate) {
      query = query.lte('created_at', filter.endDate.toISOString());
    }

    // Pagination
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch activity feed: ${error.message}`);
    }

    const activities: IActivityItem[] = (data || []).map(this.mapDatabaseActivityToModel);

    return {
      activities,
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0)
    };
  }

  /**
   * Create notification
   */
  async createNotification(notification: Omit<INotification, 'id' | 'createdAt'>): Promise<INotification> {
    const notificationItem: INotification = {
      ...notification,
      id: uuidv4(),
      createdAt: new Date()
    };

    const { error } = await this.supabase
      .from('notifications')
      .insert({
        id: notificationItem.id,
        user_id: notificationItem.userId,
        type: notificationItem.type,
        title: notificationItem.title,
        message: notificationItem.message,
        data: notificationItem.data,
        is_read: notificationItem.isRead,
        priority: notificationItem.priority,
        action_url: notificationItem.actionUrl,
        action_text: notificationItem.actionText,
        expires_at: notificationItem.expiresAt?.toISOString(),
        created_at: notificationItem.createdAt.toISOString()
      });

    if (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    return notificationItem;
  }

  /**
   * Get notifications for user
   */
  async getNotifications(filter: INotificationFilter): Promise<{
    notifications: INotification[];
    unreadCount: number;
    totalCount: number;
    hasMore: boolean;
  }> {
    let query = this.supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', filter.userId);

    // Apply filters
    if (filter.types && filter.types.length > 0) {
      query = query.in('type', filter.types);
    }

    if (filter.isRead !== undefined) {
      query = query.eq('is_read', filter.isRead);
    }

    if (filter.priority && filter.priority.length > 0) {
      query = query.in('priority', filter.priority);
    }

    if (filter.startDate) {
      query = query.gte('created_at', filter.startDate.toISOString());
    }

    if (filter.endDate) {
      query = query.lte('created_at', filter.endDate.toISOString());
    }

    // Remove expired notifications
    query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    // Pagination
    const limit = filter.limit || 20;
    const offset = filter.offset || 0;
    
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    // Get unread count
    const { count: unreadCount } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', filter.userId)
      .eq('is_read', false)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    const notifications: INotification[] = (data || []).map(this.mapDatabaseNotificationToModel);

    return {
      notifications,
      unreadCount: unreadCount || 0,
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0)
    };
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  /**
   * Subscribe to activity updates for a session
   */
  subscribeToActivityFeed(
    sessionId: string,
    callback: (activities: IActivityItem[]) => void
  ): () => void {
    const listenerId = `${sessionId}-${uuidv4()}`;
    this.listeners.set(listenerId, callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listenerId);
    };
  }

  /**
   * Subscribe to notifications for a user
   */
  subscribeToNotifications(
    userId: string,
    callback: (notifications: INotification[]) => void
  ): () => void {
    const listenerId = `${userId}-${uuidv4()}`;
    this.notificationListeners.set(listenerId, callback);

    // Return unsubscribe function
    return () => {
      this.notificationListeners.delete(listenerId);
    };
  }

  /**
   * Generate notifications from activity
   */
  private async generateNotificationsFromActivity(activity: IActivityItem): Promise<void> {
    try {
      // Get session participants to notify
      const { data: participants } = await this.supabase
        .from('collaboration_participants')
        .select('user_id, user_name')
        .eq('session_id', activity.sessionId)
        .neq('user_id', activity.userId); // Don't notify the actor

      if (!participants || participants.length === 0) return;

      const notifications: Omit<INotification, 'id' | 'createdAt'>[] = [];

      // Generate notifications based on activity type
      switch (activity.activityType) {
        case 'content_change':
          if (activity.activityData.field && activity.activityData.elementId) {
            notifications.push(...participants.map(p => ({
              userId: p.user_id,
              type: 'activity' as const,
              title: 'Content Updated',
              message: `${activity.userName} updated ${activity.activityData.field}`,
              data: {
                activityId: activity.id,
                sessionId: activity.sessionId,
                elementId: activity.activityData.elementId,
                field: activity.activityData.field
              },
              isRead: false,
              priority: 'low' as const,
              actionUrl: `/collaboration/${activity.sessionId}`
            })));
          }
          break;

        case 'comment_add':
          notifications.push(...participants.map(p => ({
            userId: p.user_id,
            type: 'activity' as const,
            title: 'New Comment',
            message: `${activity.userName} added a comment`,
            data: {
              activityId: activity.id,
              sessionId: activity.sessionId,
              commentId: activity.activityData.commentId
            },
            isRead: false,
            priority: 'medium' as const,
            actionUrl: `/collaboration/${activity.sessionId}#comment-${activity.activityData.commentId}`
          })));
          break;

        case 'conflict_detected':
          notifications.push(...participants.map(p => ({
            userId: p.user_id,
            type: 'conflict' as const,
            title: 'Editing Conflict Detected',
            message: `A conflict was detected in ${activity.activityData.field}`,
            data: {
              activityId: activity.id,
              sessionId: activity.sessionId,
              conflictId: activity.activityData.conflictId
            },
            isRead: false,
            priority: 'high' as const,
            actionUrl: `/collaboration/${activity.sessionId}`,
            actionText: 'Resolve Conflict'
          })));
          break;

        case 'approval_requested':
          // Only notify users with approval permissions
          const approvers = participants.filter(p => 
            activity.activityData.approvers?.includes(p.user_id)
          );
          
          notifications.push(...approvers.map(p => ({
            userId: p.user_id,
            type: 'approval' as const,
            title: 'Approval Required',
            message: `${activity.userName} requested approval for changes`,
            data: {
              activityId: activity.id,
              sessionId: activity.sessionId,
              approvalId: activity.activityData.approvalId
            },
            isRead: false,
            priority: 'high' as const,
            actionUrl: `/collaboration/${activity.sessionId}/approval/${activity.activityData.approvalId}`,
            actionText: 'Review & Approve',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          })));
          break;

        case 'user_joined':
          notifications.push(...participants.map(p => ({
            userId: p.user_id,
            type: 'activity' as const,
            title: 'User Joined Session',
            message: `${activity.userName} joined the collaboration session`,
            data: {
              activityId: activity.id,
              sessionId: activity.sessionId
            },
            isRead: false,
            priority: 'low' as const
          })));
          break;
      }

      // Create all notifications
      for (const notification of notifications) {
        await this.createNotification(notification);
      }

    } catch (error) {
      console.error('Error generating notifications from activity:', error);
    }
  }

  /**
   * Handle activity updates from real-time subscription
   */
  private handleActivityUpdate(activity: any): void {
    const mappedActivity = this.mapDatabaseActivityToModel(activity);
    
    // Notify relevant listeners
    this.listeners.forEach((callback, listenerId) => {
      if (listenerId.startsWith(activity.session_id)) {
        // For now, just pass single activity - in production, you'd fetch latest activities
        callback([mappedActivity]);
      }
    });
  }

  /**
   * Handle notification updates from real-time subscription
   */
  private handleNotificationUpdate(payload: any): void {
    const notification = this.mapDatabaseNotificationToModel(payload.new);
    
    // Notify relevant listeners
    this.notificationListeners.forEach((callback, listenerId) => {
      if (listenerId.startsWith(notification.userId)) {
        // For now, just pass single notification - in production, you'd fetch latest notifications
        callback([notification]);
      }
    });
  }

  /**
   * Map database activity to model
   */
  private mapDatabaseActivityToModel(dbActivity: any): IActivityItem {
    return {
      id: dbActivity.id,
      sessionId: dbActivity.session_id,
      userId: dbActivity.user_id,
      userName: dbActivity.user_name,
      userAvatar: dbActivity.user_avatar,
      activityType: dbActivity.activity_type,
      activityData: dbActivity.activity_data,
      resourceType: dbActivity.resource_type,
      resourceId: dbActivity.resource_id,
      metadata: dbActivity.metadata,
      createdAt: new Date(dbActivity.created_at)
    };
  }

  /**
   * Map database notification to model
   */
  private mapDatabaseNotificationToModel(dbNotification: any): INotification {
    return {
      id: dbNotification.id,
      userId: dbNotification.user_id,
      type: dbNotification.type,
      title: dbNotification.title,
      message: dbNotification.message,
      data: dbNotification.data,
      isRead: dbNotification.is_read,
      priority: dbNotification.priority,
      actionUrl: dbNotification.action_url,
      actionText: dbNotification.action_text,
      createdAt: new Date(dbNotification.created_at),
      expiresAt: dbNotification.expires_at ? new Date(dbNotification.expires_at) : undefined
    };
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .not('expires_at', 'is', null);

    if (error) {
      console.error('Failed to cleanup expired notifications:', error);
    }
  }

  /**
   * Get activity statistics
   */
  async getActivityStatistics(sessionId: string): Promise<{
    totalActivities: number;
    contentChanges: number;
    comments: number;
    conflicts: number;
    participantCount: number;
    mostActiveUser: { userId: string; userName: string; activityCount: number } | null;
  }> {
    // Get total activity count
    const { count: totalActivities } = await this.supabase
      .from('collaboration_activities')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    // Get content changes count
    const { count: contentChanges } = await this.supabase
      .from('collaboration_activities')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('activity_type', 'content_change');

    // Get comments count
    const { count: comments } = await this.supabase
      .from('collaboration_activities')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .in('activity_type', ['comment_add', 'comment_reply']);

    // Get conflicts count
    const { count: conflicts } = await this.supabase
      .from('collaboration_activities')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('activity_type', 'conflict_detected');

    // Get unique participant count
    const { data: participants } = await this.supabase
      .from('collaboration_activities')
      .select('user_id, user_name')
      .eq('session_id', sessionId);

    const uniqueParticipants = new Map();
    participants?.forEach(p => {
      if (!uniqueParticipants.has(p.user_id)) {
        uniqueParticipants.set(p.user_id, { userId: p.user_id, userName: p.user_name, count: 0 });
      }
      uniqueParticipants.get(p.user_id).count++;
    });

    const participantArray = Array.from(uniqueParticipants.values());
    const mostActiveUser = participantArray.length > 0 
      ? participantArray.reduce((max, current) => 
          current.count > max.activityCount ? 
            { userId: current.userId, userName: current.userName, activityCount: current.count } : 
            max
        , { userId: '', userName: '', activityCount: 0 })
      : null;

    return {
      totalActivities: totalActivities || 0,
      contentChanges: contentChanges || 0,
      comments: comments || 0,
      conflicts: conflicts || 0,
      participantCount: uniqueParticipants.size,
      mostActiveUser: mostActiveUser?.activityCount > 0 ? mostActiveUser : null
    };
  }
}

// Export singleton instance
export const activityFeedService = new ActivityFeedService();