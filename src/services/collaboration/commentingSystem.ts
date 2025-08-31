import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export interface IComment {
  id: string;
  sessionId: string;
  elementId: string;
  parentCommentId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  attachments?: ICommentAttachment[];
  createdAt: Date;
  updatedAt?: Date;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  reactions: ICommentReaction[];
  metadata?: Record<string, any>;
}

export interface ICommentAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
  uploadedAt: Date;
}

export interface ICommentReaction {
  userId: string;
  userName: string;
  emoji: string;
  createdAt: Date;
}

export interface IApprovalWorkflow {
  id: string;
  sessionId: string;
  elementId: string;
  requestedBy: string;
  requestedByName: string;
  title: string;
  description: string;
  changeData: any;
  requiredApprovers: string[];
  approvers: IApprover[];
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

export interface IApprover {
  userId: string;
  userName: string;
  userEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  approvedAt?: Date;
  notifiedAt?: Date;
}

export interface ICommentFilter {
  sessionId?: string;
  elementId?: string;
  userId?: string;
  isResolved?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface IApprovalFilter {
  sessionId?: string;
  requestedBy?: string;
  approverId?: string;
  status?: string[];
  priority?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class CommentingSystem {
  private supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  );

  private commentListeners: Map<string, (comments: IComment[]) => void> = new Map();
  private approvalListeners: Map<string, (workflows: IApprovalWorkflow[]) => void> = new Map();

  constructor() {
    this.initializeRealtimeSubscriptions();
  }

  /**
   * Initialize real-time subscriptions
   */
  private initializeRealtimeSubscriptions() {
    // Subscribe to comment changes
    this.supabase
      .channel('collaboration_comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaboration_comments'
        },
        (payload) => {
          this.handleCommentUpdate(payload);
        }
      )
      .subscribe();

    // Subscribe to approval workflow changes
    this.supabase
      .channel('approval_workflows')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'approval_workflows'
        },
        (payload) => {
          this.handleApprovalUpdate(payload);
        }
      )
      .subscribe();
  }

  /**
   * Add comment
   */
  async addComment(
    sessionId: string,
    elementId: string,
    userId: string,
    userName: string,
    content: string,
    parentCommentId?: string,
    userAvatar?: string,
    attachments?: Omit<ICommentAttachment, 'id' | 'uploadedAt'>[]
  ): Promise<IComment> {
    const comment: IComment = {
      id: uuidv4(),
      sessionId,
      elementId,
      parentCommentId,
      userId,
      userName,
      userAvatar,
      content,
      attachments: attachments?.map(att => ({
        ...att,
        id: uuidv4(),
        uploadedAt: new Date()
      })) || [],
      createdAt: new Date(),
      isResolved: false,
      reactions: []
    };

    const { error } = await this.supabase
      .from('collaboration_comments')
      .insert({
        id: comment.id,
        session_id: comment.sessionId,
        element_id: comment.elementId,
        parent_comment_id: comment.parentCommentId,
        user_id: comment.userId,
        user_name: comment.userName,
        user_avatar: comment.userAvatar,
        content: comment.content,
        attachments: comment.attachments,
        created_at: comment.createdAt.toISOString(),
        is_resolved: comment.isResolved,
        reactions: comment.reactions
      });

    if (error) {
      throw new Error(`Failed to add comment: ${error.message}`);
    }

    return comment;
  }

  /**
   * Get comments
   */
  async getComments(filter: ICommentFilter): Promise<{
    comments: IComment[];
    totalCount: number;
    hasMore: boolean;
  }> {
    let query = this.supabase
      .from('collaboration_comments')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filter.sessionId) {
      query = query.eq('session_id', filter.sessionId);
    }

    if (filter.elementId) {
      query = query.eq('element_id', filter.elementId);
    }

    if (filter.userId) {
      query = query.eq('user_id', filter.userId);
    }

    if (filter.isResolved !== undefined) {
      query = query.eq('is_resolved', filter.isResolved);
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
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch comments: ${error.message}`);
    }

    const comments: IComment[] = (data || []).map(this.mapDatabaseCommentToModel);

    return {
      comments,
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0)
    };
  }

  /**
   * Update comment
   */
  async updateComment(
    commentId: string,
    updates: {
      content?: string;
      isResolved?: boolean;
      resolvedBy?: string;
    }
  ): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.content !== undefined) {
      updateData.content = updates.content;
    }

    if (updates.isResolved !== undefined) {
      updateData.is_resolved = updates.isResolved;
      
      if (updates.isResolved && updates.resolvedBy) {
        updateData.resolved_by = updates.resolvedBy;
        updateData.resolved_at = new Date().toISOString();
      }
    }

    const { error } = await this.supabase
      .from('collaboration_comments')
      .update(updateData)
      .eq('id', commentId);

    if (error) {
      throw new Error(`Failed to update comment: ${error.message}`);
    }
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('collaboration_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  }

  /**
   * Add reaction to comment
   */
  async addReaction(
    commentId: string,
    userId: string,
    userName: string,
    emoji: string
  ): Promise<void> {
    // Get current comment
    const { data: comment, error: fetchError } = await this.supabase
      .from('collaboration_comments')
      .select('reactions')
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) {
      throw new Error('Comment not found');
    }

    const currentReactions = comment.reactions || [];
    
    // Check if user already reacted with this emoji
    const existingReactionIndex = currentReactions.findIndex(
      (r: any) => r.userId === userId && r.emoji === emoji
    );

    let updatedReactions;
    if (existingReactionIndex >= 0) {
      // Remove existing reaction
      updatedReactions = currentReactions.filter(
        (_: any, index: number) => index !== existingReactionIndex
      );
    } else {
      // Add new reaction
      updatedReactions = [
        ...currentReactions,
        {
          userId,
          userName,
          emoji,
          createdAt: new Date().toISOString()
        }
      ];
    }

    const { error } = await this.supabase
      .from('collaboration_comments')
      .update({ reactions: updatedReactions })
      .eq('id', commentId);

    if (error) {
      throw new Error(`Failed to update reaction: ${error.message}`);
    }
  }

  /**
   * Create approval workflow
   */
  async createApprovalWorkflow(
    sessionId: string,
    elementId: string,
    requestedBy: string,
    requestedByName: string,
    title: string,
    description: string,
    changeData: any,
    requiredApprovers: string[],
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    dueDate?: Date
  ): Promise<IApprovalWorkflow> {
    const workflow: IApprovalWorkflow = {
      id: uuidv4(),
      sessionId,
      elementId,
      requestedBy,
      requestedByName,
      title,
      description,
      changeData,
      requiredApprovers,
      approvers: requiredApprovers.map(userId => ({
        userId,
        userName: '',
        userEmail: '',
        status: 'pending',
        notifiedAt: new Date()
      })),
      status: 'pending',
      createdAt: new Date(),
      dueDate,
      priority
    };

    // Get approver details
    const { data: users } = await this.supabase
      .from('users')
      .select('id, full_name, email')
      .in('id', requiredApprovers);

    if (users) {
      workflow.approvers = workflow.approvers.map(approver => {
        const user = users.find(u => u.id === approver.userId);
        return {
          ...approver,
          userName: user?.full_name || approver.userName,
          userEmail: user?.email || approver.userEmail
        };
      });
    }

    const { error } = await this.supabase
      .from('approval_workflows')
      .insert({
        id: workflow.id,
        session_id: workflow.sessionId,
        element_id: workflow.elementId,
        requested_by: workflow.requestedBy,
        requested_by_name: workflow.requestedByName,
        title: workflow.title,
        description: workflow.description,
        change_data: workflow.changeData,
        required_approvers: workflow.requiredApprovers,
        approvers: workflow.approvers,
        status: workflow.status,
        priority: workflow.priority,
        due_date: workflow.dueDate?.toISOString(),
        created_at: workflow.createdAt.toISOString()
      });

    if (error) {
      throw new Error(`Failed to create approval workflow: ${error.message}`);
    }

    return workflow;
  }

  /**
   * Get approval workflows
   */
  async getApprovalWorkflows(filter: IApprovalFilter): Promise<{
    workflows: IApprovalWorkflow[];
    totalCount: number;
    hasMore: boolean;
  }> {
    let query = this.supabase
      .from('approval_workflows')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filter.sessionId) {
      query = query.eq('session_id', filter.sessionId);
    }

    if (filter.requestedBy) {
      query = query.eq('requested_by', filter.requestedBy);
    }

    if (filter.approverId) {
      query = query.contains('required_approvers', [filter.approverId]);
    }

    if (filter.status && filter.status.length > 0) {
      query = query.in('status', filter.status);
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

    // Pagination
    const limit = filter.limit || 20;
    const offset = filter.offset || 0;
    
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch approval workflows: ${error.message}`);
    }

    const workflows: IApprovalWorkflow[] = (data || []).map(this.mapDatabaseWorkflowToModel);

    return {
      workflows,
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0)
    };
  }

  /**
   * Update approval status
   */
  async updateApprovalStatus(
    workflowId: string,
    approverId: string,
    status: 'approved' | 'rejected',
    comment?: string
  ): Promise<void> {
    // Get current workflow
    const { data: workflow, error: fetchError } = await this.supabase
      .from('approval_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (fetchError || !workflow) {
      throw new Error('Approval workflow not found');
    }

    // Update approver status
    const updatedApprovers = workflow.approvers.map((approver: any) => {
      if (approver.userId === approverId) {
        return {
          ...approver,
          status,
          comment,
          approvedAt: new Date().toISOString()
        };
      }
      return approver;
    });

    // Determine overall workflow status
    let workflowStatus = workflow.status;
    const approvedCount = updatedApprovers.filter((a: any) => a.status === 'approved').length;
    const rejectedCount = updatedApprovers.filter((a: any) => a.status === 'rejected').length;
    const totalApprovers = updatedApprovers.length;

    if (rejectedCount > 0) {
      workflowStatus = 'rejected';
    } else if (approvedCount === totalApprovers) {
      workflowStatus = 'approved';
    }

    const updateData: any = {
      approvers: updatedApprovers,
      status: workflowStatus
    };

    if (workflowStatus !== 'pending') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('approval_workflows')
      .update(updateData)
      .eq('id', workflowId);

    if (error) {
      throw new Error(`Failed to update approval status: ${error.message}`);
    }
  }

  /**
   * Cancel approval workflow
   */
  async cancelApprovalWorkflow(workflowId: string): Promise<void> {
    const { error } = await this.supabase
      .from('approval_workflows')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('id', workflowId);

    if (error) {
      throw new Error(`Failed to cancel approval workflow: ${error.message}`);
    }
  }

  /**
   * Subscribe to comments for an element
   */
  subscribeToComments(
    elementId: string,
    callback: (comments: IComment[]) => void
  ): () => void {
    const listenerId = `comments-${elementId}-${uuidv4()}`;
    this.commentListeners.set(listenerId, callback);

    return () => {
      this.commentListeners.delete(listenerId);
    };
  }

  /**
   * Subscribe to approval workflows
   */
  subscribeToApprovals(
    userId: string,
    callback: (workflows: IApprovalWorkflow[]) => void
  ): () => void {
    const listenerId = `approvals-${userId}-${uuidv4()}`;
    this.approvalListeners.set(listenerId, callback);

    return () => {
      this.approvalListeners.delete(listenerId);
    };
  }

  /**
   * Handle comment updates from real-time subscription
   */
  private handleCommentUpdate(payload: any): void {
    const comment = this.mapDatabaseCommentToModel(payload.new || payload.old);
    
    // Notify relevant listeners
    this.commentListeners.forEach((callback, listenerId) => {
      if (listenerId.includes(comment.elementId)) {
        // In a real implementation, you'd fetch the latest comments for the element
        callback([comment]);
      }
    });
  }

  /**
   * Handle approval workflow updates from real-time subscription
   */
  private handleApprovalUpdate(payload: any): void {
    const workflow = this.mapDatabaseWorkflowToModel(payload.new || payload.old);
    
    // Notify relevant listeners
    this.approvalListeners.forEach((callback, listenerId) => {
      const userId = listenerId.split('-')[1];
      if (workflow.requiredApprovers.includes(userId) || workflow.requestedBy === userId) {
        callback([workflow]);
      }
    });
  }

  /**
   * Map database comment to model
   */
  private mapDatabaseCommentToModel(dbComment: any): IComment {
    return {
      id: dbComment.id,
      sessionId: dbComment.session_id,
      elementId: dbComment.element_id,
      parentCommentId: dbComment.parent_comment_id,
      userId: dbComment.user_id,
      userName: dbComment.user_name,
      userAvatar: dbComment.user_avatar,
      content: dbComment.content,
      attachments: dbComment.attachments || [],
      createdAt: new Date(dbComment.created_at),
      updatedAt: dbComment.updated_at ? new Date(dbComment.updated_at) : undefined,
      isResolved: dbComment.is_resolved,
      resolvedBy: dbComment.resolved_by,
      resolvedAt: dbComment.resolved_at ? new Date(dbComment.resolved_at) : undefined,
      reactions: dbComment.reactions || [],
      metadata: dbComment.metadata
    };
  }

  /**
   * Map database workflow to model
   */
  private mapDatabaseWorkflowToModel(dbWorkflow: any): IApprovalWorkflow {
    return {
      id: dbWorkflow.id,
      sessionId: dbWorkflow.session_id,
      elementId: dbWorkflow.element_id,
      requestedBy: dbWorkflow.requested_by,
      requestedByName: dbWorkflow.requested_by_name,
      title: dbWorkflow.title,
      description: dbWorkflow.description,
      changeData: dbWorkflow.change_data,
      requiredApprovers: dbWorkflow.required_approvers,
      approvers: dbWorkflow.approvers,
      status: dbWorkflow.status,
      priority: dbWorkflow.priority,
      createdAt: new Date(dbWorkflow.created_at),
      completedAt: dbWorkflow.completed_at ? new Date(dbWorkflow.completed_at) : undefined,
      dueDate: dbWorkflow.due_date ? new Date(dbWorkflow.due_date) : undefined,
      metadata: dbWorkflow.metadata
    };
  }

  /**
   * Get comment thread (comment with replies)
   */
  async getCommentThread(commentId: string): Promise<IComment[]> {
    const { data, error } = await this.supabase
      .from('collaboration_comments')
      .select('*')
      .or(`id.eq.${commentId},parent_comment_id.eq.${commentId}`)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch comment thread: ${error.message}`);
    }

    return (data || []).map(this.mapDatabaseCommentToModel);
  }

  /**
   * Get pending approvals for user
   */
  async getPendingApprovalsForUser(userId: string): Promise<IApprovalWorkflow[]> {
    const result = await this.getApprovalWorkflows({
      approverId: userId,
      status: ['pending']
    });
    
    return result.workflows.filter(workflow => 
      workflow.approvers.some(approver => 
        approver.userId === userId && approver.status === 'pending'
      )
    );
  }
}

// Export singleton instance
export const commentingSystem = new CommentingSystem();