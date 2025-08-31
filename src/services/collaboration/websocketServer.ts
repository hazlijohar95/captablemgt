import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { logger } from '../loggingService';

export interface IWebSocketMessage {
  type: 'join_session' | 'leave_session' | 'cursor_move' | 'selection_change' | 
        'content_change' | 'comment_add' | 'comment_reply' | 'user_status' | 
        'file_lock' | 'file_unlock' | 'conflict_resolution' | 'activity_feed';
  sessionId: string;
  userId: string;
  timestamp: number;
  data: any;
  messageId?: string;
}

export interface ICollaborationSession {
  id: string;
  companyId: string;
  resourceType: 'cap_table' | 'shareholders' | 'transactions' | 'share_classes' | 'vesting_schedules';
  resourceId: string;
  participants: Map<string, ISessionParticipant>;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface ISessionParticipant {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  connectionId: string;
  joinedAt: Date;
  lastSeen: Date;
  status: 'active' | 'idle' | 'away';
  cursor?: ICursorPosition;
  selection?: ISelectionRange;
  permissions: string[];
}

export interface ICursorPosition {
  x: number;
  y: number;
  elementId?: string;
  elementType?: string;
}

export interface ISelectionRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  elementId?: string;
}

export interface IContentChange {
  changeId: string;
  elementId: string;
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'insert' | 'update' | 'delete';
  conflictResolution?: 'accept' | 'reject' | 'merge';
}

export interface IFileConflict {
  conflictId: string;
  elementId: string;
  field: string;
  baseValue: any;
  conflictingChanges: Array<{
    userId: string;
    value: any;
    timestamp: number;
  }>;
  status: 'pending' | 'resolved';
}

// Message validation schemas
const MessageSchema = z.object({
  type: z.enum(['join_session', 'leave_session', 'cursor_move', 'selection_change', 
                'content_change', 'comment_add', 'comment_reply', 'user_status', 
                'file_lock', 'file_unlock', 'conflict_resolution', 'activity_feed']),
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  timestamp: z.number(),
  data: z.object({}).passthrough(),
  messageId: z.string().optional()
});

const CursorPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  elementId: z.string().optional(),
  elementType: z.string().optional()
});

const ContentChangeSchema = z.object({
  changeId: z.string().uuid(),
  elementId: z.string(),
  field: z.string(),
  oldValue: z.any(),
  newValue: z.any(),
  changeType: z.enum(['insert', 'update', 'delete']),
  conflictResolution: z.enum(['accept', 'reject', 'merge']).optional()
});

export class WebSocketCollaborationServer {
  private wss: WebSocketServer | null = null;
  private sessions: Map<string, ICollaborationSession> = new Map();
  private connections: Map<string, { 
    ws: WebSocket; 
    sessionId: string; 
    userId: string;
    messageCount: number;
    lastMessage: number;
  }> = new Map();
  private conflicts: Map<string, IFileConflict> = new Map();
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Rate limiting configuration
  private readonly MAX_MESSAGES_PER_MINUTE = 60;
  private readonly MAX_MESSAGE_SIZE = 65536; // 64KB
  private readonly MAX_CONNECTIONS_PER_USER = 5;

  constructor(private port: number = 8080) {}

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.port });
        
        this.wss.on('connection', (ws: WebSocket, request) => {
          this.handleConnection(ws, request);
        });

        this.wss.on('error', (error) => {
          console.error('WebSocket server error:', error);
          reject(error);
        });

        // Start cleanup interval
        setInterval(() => {
          this.cleanupInactiveSessions();
        }, 30000); // Every 30 seconds

        logger.info('WebSocket collaboration server started', { port: this.port });
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleConnection(ws: WebSocket, request: any) {
    const connectionId = uuidv4();
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    const userId = url.searchParams.get('userId');
    const token = url.searchParams.get('token');

    // Validate required parameters
    if (!sessionId || !userId || !token) {
      ws.close(1008, 'Missing required parameters');
      return;
    }

    // Check connection limits per user
    const userConnections = Array.from(this.connections.values())
      .filter(conn => conn.userId === userId);
    
    if (userConnections.length >= this.MAX_CONNECTIONS_PER_USER) {
      ws.close(1008, 'Too many connections');
      return;
    }

    // Verify JWT token and get user info
    this.verifyUserToken(token, userId)
      .then(userInfo => {
        if (!userInfo) {
          ws.close(1008, 'Invalid authentication token');
          return;
        }

        // Store connection with rate limiting tracking
        this.connections.set(connectionId, { 
          ws, 
          sessionId, 
          userId,
          messageCount: 0,
          lastMessage: Date.now()
        });

        // Join session
        this.joinSession(sessionId, userId, userInfo, connectionId)
          .then(session => {
            // Send session state to new participant
            this.sendToConnection(connectionId, {
              type: 'join_session',
              sessionId,
              userId,
              timestamp: Date.now(),
              data: {
                session: this.serializeSession(session),
                participants: Array.from(session.participants.values()),
                connectionId
              }
            });

            // Notify other participants
            this.broadcastToSession(sessionId, {
              type: 'user_status',
              sessionId,
              userId,
              timestamp: Date.now(),
              data: {
                action: 'joined',
                participant: session.participants.get(userId)
              }
            }, [userId]);

            // Set up message handler with validation
            ws.on('message', (data: Buffer) => {
              this.handleMessage(connectionId, data);
            });

            // Handle disconnect
            ws.on('close', () => {
              this.handleDisconnect(connectionId);
            });

            ws.on('error', (error) => {
              console.error(`WebSocket error for connection ${connectionId}:`, error);
              this.handleDisconnect(connectionId);
            });
          })
          .catch(error => {
            console.error('Error joining session:', error);
            ws.close(1011, 'Failed to join session');
          });
      })
      .catch(error => {
        console.error('Token verification failed:', error);
        ws.close(1008, 'Authentication failed');
      });
  }

  private async verifyUserToken(token: string, userId: string): Promise<any> {
    try {
      const { data: user, error } = await this.supabase.auth.getUser(token);
      
      if (error || !user?.user || user.user.id !== userId) {
        return null;
      }

      return {
        id: user.user.id,
        email: user.user.email,
        name: user.user.user_metadata?.full_name || user.user.email,
        avatar: user.user.user_metadata?.avatar_url
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  private async joinSession(
    sessionId: string,
    userId: string,
    userInfo: any,
    connectionId: string
  ): Promise<ICollaborationSession> {
    // Get or create session
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      // Load session from database
      session = await this.loadSessionFromDatabase(sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      this.sessions.set(sessionId, session);
    }

    // Add participant
    const participant: ISessionParticipant = {
      userId,
      userName: userInfo.name,
      userEmail: userInfo.email,
      userAvatar: userInfo.avatar,
      connectionId,
      joinedAt: new Date(),
      lastSeen: new Date(),
      status: 'active',
      permissions: await this.getUserPermissions(userId, session.companyId)
    };

    session.participants.set(userId, participant);
    session.lastActivity = new Date();
    session.isActive = true;

    // Update session in database
    await this.updateSessionInDatabase(session);

    return session;
  }

  private async loadSessionFromDatabase(sessionId: string): Promise<ICollaborationSession | null> {
    const { data, error } = await this.supabase
      .from('collaboration_sessions')
      .select(`
        *,
        collaboration_participants!inner(*)
      `)
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      return null;
    }

    const session: ICollaborationSession = {
      id: data.id,
      companyId: data.company_id,
      resourceType: data.resource_type,
      resourceId: data.resource_id,
      participants: new Map(),
      createdAt: new Date(data.created_at),
      lastActivity: new Date(data.last_activity),
      isActive: data.is_active,
      metadata: data.metadata || {}
    };

    return session;
  }

  private async updateSessionInDatabase(session: ICollaborationSession): Promise<void> {
    const participants = Array.from(session.participants.values());
    
    // Update session
    await this.supabase
      .from('collaboration_sessions')
      .update({
        last_activity: session.lastActivity.toISOString(),
        is_active: session.isActive,
        participant_count: participants.length,
        metadata: session.metadata
      })
      .eq('id', session.id);

    // Update participants
    for (const participant of participants) {
      await this.supabase
        .from('collaboration_participants')
        .upsert({
          session_id: session.id,
          user_id: participant.userId,
          user_name: participant.userName,
          user_email: participant.userEmail,
          user_avatar: participant.userAvatar,
          joined_at: participant.joinedAt.toISOString(),
          last_seen: participant.lastSeen.toISOString(),
          status: participant.status,
          cursor_position: participant.cursor,
          selection_range: participant.selection,
          permissions: participant.permissions
        });
    }
  }

  private async getUserPermissions(userId: string, companyId: string): Promise<string[]> {
    const { data } = await this.supabase
      .from('company_users')
      .select('role, permissions')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();

    if (!data) {
      return ['read']; // Default permissions
    }

    const rolePermissions = {
      'owner': ['read', 'write', 'admin', 'delete'],
      'admin': ['read', 'write', 'admin'],
      'editor': ['read', 'write'],
      'viewer': ['read']
    };

    return rolePermissions[data.role as keyof typeof rolePermissions] || ['read'];
  }

  private async handleMessage(connectionId: string, data: Buffer) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;

      // Check message size limit
      if (data.length > this.MAX_MESSAGE_SIZE) {
        console.warn(`Message too large from connection ${connectionId}: ${data.length} bytes`);
        return;
      }

      // Rate limiting check
      const now = Date.now();
      if (now - connection.lastMessage < 60000) { // Within last minute
        connection.messageCount++;
      } else {
        connection.messageCount = 1;
        connection.lastMessage = now;
      }

      if (connection.messageCount > this.MAX_MESSAGES_PER_MINUTE) {
        console.warn(`Rate limit exceeded for connection ${connectionId}`);
        return;
      }

      // Parse and validate message
      const rawMessage = JSON.parse(data.toString());
      const message = MessageSchema.parse({
        ...rawMessage,
        timestamp: Date.now(),
        messageId: uuidv4()
      });

      const session = this.sessions.get(connection.sessionId);
      if (!session) return;

      const participant = session.participants.get(connection.userId);
      if (!participant) return;

      // Update participant activity
      participant.lastSeen = new Date();
      participant.status = 'active';

      // Handle different message types with validation
      switch (message.type) {
        case 'cursor_move':
          const cursorData = CursorPositionSchema.parse(message.data);
          await this.handleCursorMove(session, participant, cursorData);
          break;

        case 'content_change':
          const changeData = ContentChangeSchema.parse(message.data);
          await this.handleContentChange(session, participant, changeData);
          break;

        case 'comment_add':
        case 'comment_reply':
          await this.handleComment(session, participant, message);
          break;

        case 'user_status':
          await this.handleUserStatus(session, participant, message.data);
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }

      // Update session activity
      session.lastActivity = new Date();
      await this.updateSessionInDatabase(session);

    } catch (error) {
      console.error(`Error handling message for connection ${connectionId}:`, error);
    }
  }

  private async handleCursorMove(
    session: ICollaborationSession,
    participant: ISessionParticipant,
    data: ICursorPosition
  ) {
    participant.cursor = data;

    // Broadcast cursor position to other participants
    this.broadcastToSession(session.id, {
      type: 'cursor_move',
      sessionId: session.id,
      userId: participant.userId,
      timestamp: Date.now(),
      data: {
        cursor: data,
        participant: {
          userId: participant.userId,
          userName: participant.userName,
          userAvatar: participant.userAvatar
        }
      }
    }, [participant.userId]);
  }

  private async handleContentChange(
    session: ICollaborationSession,
    participant: ISessionParticipant,
    data: IContentChange
  ) {
    // Check permissions
    if (!participant.permissions.includes('write')) {
      this.sendToConnection(participant.connectionId, {
        type: 'content_change',
        sessionId: session.id,
        userId: participant.userId,
        timestamp: Date.now(),
        data: {
          error: 'Insufficient permissions',
          changeId: data.changeId
        }
      });
      return;
    }

    // Apply change to database
    await this.applyContentChange(session, participant, data);

    // Broadcast change to other participants
    this.broadcastToSession(session.id, {
      type: 'content_change',
      sessionId: session.id,
      userId: participant.userId,
      timestamp: Date.now(),
      data: {
        change: data,
        participant: {
          userId: participant.userId,
          userName: participant.userName
        }
      }
    }, [participant.userId]);
  }

  private async applyContentChange(
    session: ICollaborationSession,
    participant: ISessionParticipant,
    data: IContentChange
  ) {
    // Log activity
    await this.supabase
      .from('collaboration_activities')
      .insert({
        session_id: session.id,
        user_id: participant.userId,
        activity_type: 'content_change',
        activity_data: data,
        created_at: new Date().toISOString()
      });

    // Apply change to actual data (implementation depends on resource type)
    await this.updateResourceData(session, data);
  }

  private async updateResourceData(
    session: ICollaborationSession,
    change: IContentChange
  ) {
    const table = session.resourceType;
    const resourceId = session.resourceId;

    if (change.changeType === 'update') {
      await this.supabase
        .from(table)
        .update({ [change.field]: change.newValue })
        .eq('id', resourceId);
    }
  }

  private async handleComment(
    session: ICollaborationSession,
    participant: ISessionParticipant,
    message: IWebSocketMessage
  ) {
    // Save comment to database
    const { data: comment } = await this.supabase
      .from('collaboration_comments')
      .insert({
        session_id: session.id,
        user_id: participant.userId,
        comment_type: message.type === 'comment_reply' ? 'reply' : 'comment',
        content: message.data.content,
        element_id: message.data.elementId,
        parent_comment_id: message.data.parentCommentId,
        created_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (comment) {
      // Broadcast comment to all participants
      this.broadcastToSession(session.id, {
        type: message.type,
        sessionId: session.id,
        userId: participant.userId,
        timestamp: Date.now(),
        data: {
          comment: {
            ...comment,
            user_name: participant.userName,
            user_avatar: participant.userAvatar
          }
        }
      });
    }
  }

  private async handleUserStatus(
    session: ICollaborationSession,
    participant: ISessionParticipant,
    data: any
  ) {
    if (data.status) {
      participant.status = data.status;
    }

    // Broadcast status to other participants
    this.broadcastToSession(session.id, {
      type: 'user_status',
      sessionId: session.id,
      userId: participant.userId,
      timestamp: Date.now(),
      data: {
        status: participant.status,
        participant: {
          userId: participant.userId,
          userName: participant.userName,
          userAvatar: participant.userAvatar
        }
      }
    }, [participant.userId]);
  }

  private handleDisconnect(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const session = this.sessions.get(connection.sessionId);
    if (session) {
      const participant = session.participants.get(connection.userId);
      if (participant) {
        // Update participant status
        participant.status = 'away';
        participant.lastSeen = new Date();

        // Remove participant if no other connections
        const hasOtherConnections = Array.from(this.connections.values())
          .some(conn => 
            conn.sessionId === connection.sessionId && 
            conn.userId === connection.userId &&
            this.connections.get(connectionId) !== conn
          );

        if (!hasOtherConnections) {
          session.participants.delete(connection.userId);

          // Notify other participants
          this.broadcastToSession(connection.sessionId, {
            type: 'user_status',
            sessionId: connection.sessionId,
            userId: connection.userId,
            timestamp: Date.now(),
            data: {
              action: 'left',
              participant: {
                userId: connection.userId,
                userName: participant.userName
              }
            }
          });
        }

        // Update session in database
        this.updateSessionInDatabase(session).catch(console.error);
      }
    }

    // Remove connection
    this.connections.delete(connectionId);
  }

  private sendToConnection(connectionId: string, message: IWebSocketMessage) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  private broadcastToSession(
    sessionId: string,
    message: IWebSocketMessage,
    excludeUsers: string[] = []
  ) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    for (const [userId, participant] of session.participants) {
      if (excludeUsers.includes(userId)) continue;

      const connection = Array.from(this.connections.values())
        .find(conn => conn.sessionId === sessionId && conn.userId === userId);

      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message));
      }
    }
  }

  private serializeSession(session: ICollaborationSession) {
    return {
      id: session.id,
      companyId: session.companyId,
      resourceType: session.resourceType,
      resourceId: session.resourceId,
      createdAt: session.createdAt.toISOString(),
      lastActivity: session.lastActivity.toISOString(),
      isActive: session.isActive,
      metadata: session.metadata,
      participantCount: session.participants.size
    };
  }

  private cleanupInactiveSessions() {
    const now = new Date();
    const inactivityTimeout = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.sessions) {
      const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
      
      if (timeSinceLastActivity > inactivityTimeout) {
        // Mark session as inactive in database
        this.supabase
          .from('collaboration_sessions')
          .update({ 
            is_active: false,
            ended_at: now.toISOString()
          })
          .eq('id', sessionId)
          .then(() => {
            logger.debug('Session marked as inactive due to inactivity', { sessionId });
          })
          .catch(console.error);

        // Remove from memory
        this.sessions.delete(sessionId);
      }
    }

    // Clean up old conflicts
    const conflictTimeout = 10 * 60 * 1000; // 10 minutes
    for (const [key, conflict] of this.conflicts) {
      if (conflict.status === 'resolved') {
        this.conflicts.delete(key);
      }
    }
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          logger.info('WebSocket collaboration server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Export singleton instance
export const collaborationServer = new WebSocketCollaborationServer();