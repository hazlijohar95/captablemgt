import { createClient } from '@supabase/supabase-js';
import { IWebSocketMessage, ISessionParticipant, ICursorPosition, ISelectionRange, IContentChange } from './websocketServer';
import { logger } from '../loggingService';

export interface ICollaborationClient {
  connect(sessionId: string, userId: string): Promise<void>;
  disconnect(): void;
  sendCursorMove(position: ICursorPosition): void;
  sendSelectionChange(selection: ISelectionRange): void;
  sendContentChange(change: IContentChange): void;
  sendComment(elementId: string, content: string, parentCommentId?: string): void;
  sendFileLock(elementId: string, lockType: string): void;
  sendFileUnlock(elementId: string): void;
  sendUserStatus(status: 'active' | 'idle' | 'away'): void;
  resolveConflict(conflictId: string, selectedValue: any): void;
  
  // Event callbacks
  onParticipantJoined?: (participant: ISessionParticipant) => void;
  onParticipantLeft?: (userId: string) => void;
  onCursorMove?: (userId: string, position: ICursorPosition) => void;
  onSelectionChange?: (userId: string, selection: ISelectionRange) => void;
  onContentChange?: (userId: string, change: IContentChange) => void;
  onComment?: (comment: any) => void;
  onFileLock?: (elementId: string, lockedBy: { userId: string; userName: string }, lockType: string) => void;
  onFileUnlock?: (elementId: string) => void;
  onConflictDetected?: (conflict: any) => void;
  onConflictResolved?: (conflictId: string) => void;
  onUserStatusChange?: (userId: string, status: string) => void;
  onConnectionStateChange?: (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

export class WebSocketCollaborationClient implements ICollaborationClient {
  private ws: WebSocket | null = null;
  private sessionId: string = '';
  private userId: string = '';
  private connectionId: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  );

  // Event callbacks
  onParticipantJoined?: (participant: ISessionParticipant) => void;
  onParticipantLeft?: (userId: string) => void;
  onCursorMove?: (userId: string, position: ICursorPosition) => void;
  onSelectionChange?: (userId: string, selection: ISelectionRange) => void;
  onContentChange?: (userId: string, change: IContentChange) => void;
  onComment?: (comment: any) => void;
  onFileLock?: (elementId: string, lockedBy: { userId: string; userName: string }, lockType: string) => void;
  onFileUnlock?: (elementId: string) => void;
  onConflictDetected?: (conflict: any) => void;
  onConflictResolved?: (conflictId: string) => void;
  onUserStatusChange?: (userId: string, status: string) => void;
  onConnectionStateChange?: (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

  async connect(sessionId: string, userId: string): Promise<void> {
    this.sessionId = sessionId;
    this.userId = userId;

    // Get authentication token
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }

    const wsUrl = new URL(`${this.getWebSocketUrl()}`);
    wsUrl.searchParams.set('sessionId', sessionId);
    wsUrl.searchParams.set('userId', userId);
    wsUrl.searchParams.set('token', session.access_token);

    return new Promise((resolve, reject) => {
      this.onConnectionStateChange?.('connecting');
      
      this.ws = new WebSocket(wsUrl.toString());

      this.ws.onopen = () => {
        logger.info('WebSocket connected to collaboration session', { sessionId, userId });
        this.reconnectAttempts = 0;
        this.onConnectionStateChange?.('connected');
        this.startHeartbeat();
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = (event) => {
        logger.info('WebSocket connection closed', { code: event.code, reason: event.reason, sessionId });
        this.onConnectionStateChange?.('disconnected');
        this.stopHeartbeat();
        
        // Attempt reconnection if not intentional close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onConnectionStateChange?.('error');
        reject(error);
      };
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Intentional disconnect');
      this.ws = null;
    }

    this.onConnectionStateChange?.('disconnected');
  }

  private getWebSocketUrl(): string {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      return `${protocol}//${host}/api/collaboration`;
    }
    return 'ws://localhost:8080';
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'user_status' as const,
          sessionId: this.sessionId,
          userId: this.userId,
          timestamp: Date.now(),
          data: { heartbeat: true }
        });
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
    this.reconnectAttempts++;

    logger.info('Attempting WebSocket reconnect', { 
      delay, 
      attempt: this.reconnectAttempts, 
      maxAttempts: this.maxReconnectAttempts,
      sessionId: this.sessionId 
    });
    
    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect(this.sessionId, this.userId);
      } catch (error) {
        console.error('Reconnection failed:', error);
        // Will trigger another reconnect attempt via onclose
      }
    }, delay);
  }

  private sendMessage(message: IWebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message.type);
    }
  }

  private handleMessage(data: string): void {
    try {
      const message: IWebSocketMessage = JSON.parse(data);
      
      switch (message.type) {
        case 'join_session':
          this.handleJoinSession(message.data);
          break;

        case 'user_status':
          this.handleUserStatus(message);
          break;

        case 'cursor_move':
          this.onCursorMove?.(message.userId, message.data.cursor);
          break;

        case 'selection_change':
          this.onSelectionChange?.(message.userId, message.data.selection);
          break;

        case 'content_change':
          if (message.data.error) {
            console.error('Content change error:', message.data.error);
          } else {
            this.onContentChange?.(message.userId, message.data.change);
          }
          break;

        case 'comment_add':
        case 'comment_reply':
          this.onComment?.(message.data.comment);
          break;

        case 'file_lock':
          this.onFileLock?.(message.data.elementId, message.data.lockedBy, message.data.lockType);
          break;

        case 'file_unlock':
          this.onFileUnlock?.(message.data.elementId);
          break;

        case 'conflict_resolution':
          this.handleConflictMessage(message.data);
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private handleJoinSession(data: any): void {
    this.connectionId = data.connectionId;
    
    // Notify about existing participants
    data.participants?.forEach((participant: ISessionParticipant) => {
      if (participant.userId !== this.userId) {
        this.onParticipantJoined?.(participant);
      }
    });
  }

  private handleUserStatus(message: IWebSocketMessage): void {
    const { data } = message;
    
    if (data.action === 'joined') {
      this.onParticipantJoined?.(data.participant);
    } else if (data.action === 'left') {
      this.onParticipantLeft?.(message.userId);
    } else if (data.status) {
      this.onUserStatusChange?.(message.userId, data.status);
    }
  }

  private handleConflictMessage(data: any): void {
    switch (data.action) {
      case 'conflict_detected':
      case 'conflict_updated':
        this.onConflictDetected?.(data.conflict);
        break;
        
      case 'conflict_resolved':
        this.onConflictResolved?.(data.conflictId);
        break;
    }
  }

  // Public methods for sending different types of messages

  sendCursorMove(position: ICursorPosition): void {
    this.sendMessage({
      type: 'cursor_move',
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      data: position
    });
  }

  sendSelectionChange(selection: ISelectionRange): void {
    this.sendMessage({
      type: 'selection_change',
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      data: selection
    });
  }

  sendContentChange(change: IContentChange): void {
    this.sendMessage({
      type: 'content_change',
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      data: change
    });
  }

  sendComment(elementId: string, content: string, parentCommentId?: string): void {
    this.sendMessage({
      type: parentCommentId ? 'comment_reply' : 'comment_add',
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      data: {
        elementId,
        content,
        parentCommentId
      }
    });
  }

  sendFileLock(elementId: string, lockType: string): void {
    this.sendMessage({
      type: 'file_lock',
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      data: {
        elementId,
        lockType
      }
    });
  }

  sendFileUnlock(elementId: string): void {
    this.sendMessage({
      type: 'file_unlock',
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      data: {
        elementId
      }
    });
  }

  sendUserStatus(status: 'active' | 'idle' | 'away'): void {
    this.sendMessage({
      type: 'user_status',
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      data: {
        status
      }
    });
  }

  resolveConflict(conflictId: string, selectedValue: any): void {
    this.sendMessage({
      type: 'conflict_resolution',
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      data: {
        conflictId,
        resolution: 'accept',
        selectedValue
      }
    });
  }

  getConnectionState(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }

  getSessionInfo(): { sessionId: string; userId: string; connectionId: string } {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      connectionId: this.connectionId
    };
  }
}

// Create singleton instance
export const collaborationClient = new WebSocketCollaborationClient();