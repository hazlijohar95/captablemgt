import React, { useState, useEffect, useRef } from 'react';
import { activityFeedService, IActivityItem, IActivityFeedFilter } from '../../services/collaboration/activityFeed';
import { 
  UserIcon, 
  ChatBubbleLeftIcon, 
  PencilSquareIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface IActivityFeedProps {
  sessionId: string;
  className?: string;
  maxHeight?: string;
  showFilters?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface IActivityItemProps {
  activity: IActivityItem;
  isFirst?: boolean;
  isLast?: boolean;
}

const ActivityItemComponent: React.FC<IActivityItemProps> = ({ 
  activity, 
  isFirst = false, 
  isLast = false 
}) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_joined':
      case 'user_left':
        return <UserIcon className="w-4 h-4" />;
      case 'content_change':
        return <PencilSquareIcon className="w-4 h-4" />;
      case 'comment_add':
      case 'comment_reply':
        return <ChatBubbleLeftIcon className="w-4 h-4" />;
      case 'conflict_detected':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'conflict_resolved':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'approval_requested':
      case 'approval_granted':
      case 'approval_rejected':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'file_lock':
      case 'file_unlock':
        return <PencilSquareIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user_joined':
        return 'text-green-600 bg-green-100';
      case 'user_left':
        return 'text-gray-600 bg-gray-100';
      case 'content_change':
        return 'text-blue-600 bg-blue-100';
      case 'comment_add':
      case 'comment_reply':
        return 'text-purple-600 bg-purple-100';
      case 'conflict_detected':
        return 'text-red-600 bg-red-100';
      case 'conflict_resolved':
        return 'text-green-600 bg-green-100';
      case 'approval_requested':
        return 'text-yellow-600 bg-yellow-100';
      case 'approval_granted':
        return 'text-green-600 bg-green-100';
      case 'approval_rejected':
        return 'text-red-600 bg-red-100';
      case 'file_lock':
        return 'text-orange-600 bg-orange-100';
      case 'file_unlock':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityMessage = (activity: IActivityItem) => {
    const { activityType, activityData, userName } = activity;
    
    switch (activityType) {
      case 'user_joined':
        return `${userName} joined the session`;
      case 'user_left':
        return `${userName} left the session`;
      case 'content_change':
        return `${userName} updated ${activityData.field || 'a field'}`;
      case 'comment_add':
        return `${userName} added a comment`;
      case 'comment_reply':
        return `${userName} replied to a comment`;
      case 'conflict_detected':
        return `Editing conflict detected in ${activityData.field || 'a field'}`;
      case 'conflict_resolved':
        return `${userName} resolved an editing conflict`;
      case 'approval_requested':
        return `${userName} requested approval`;
      case 'approval_granted':
        return `${userName} approved changes`;
      case 'approval_rejected':
        return `${userName} rejected changes`;
      case 'file_lock':
        return `${userName} locked ${activityData.elementId || 'an element'} for editing`;
      case 'file_unlock':
        return `${userName} unlocked ${activityData.elementId || 'an element'}`;
      default:
        return `${userName} performed an action`;
    }
  };

  return (
    <div className="flex items-start space-x-3 py-3">
      {!isLast && (
        <div className="absolute left-[1.125rem] mt-8 h-full w-px bg-gray-200" />
      )}
      
      <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${getActivityColor(activity.activityType)}`}>
        {getActivityIcon(activity.activityType)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          {activity.userAvatar ? (
            <img
              src={activity.userAvatar}
              alt={activity.userName}
              className="w-5 h-5 rounded-full"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
              <UserIcon className="w-3 h-3 text-gray-600" />
            </div>
          )}
          
          <div className="flex-1">
            <p className="text-sm text-gray-900">
              {getActivityMessage(activity)}
            </p>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ActivityFeed: React.FC<IActivityFeedProps> = ({
  sessionId,
  className = '',
  maxHeight = 'max-h-96',
  showFilters = false,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const [activities, setActivities] = useState<IActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<IActivityFeedFilter>({
    sessionId,
    limit: 50
  });
  const [hasMore, setHasMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const loadActivities = async (newFilter?: IActivityFeedFilter) => {
    try {
      setError(null);
      const filterToUse = newFilter || filter;
      
      const result = await activityFeedService.getActivityFeed(filterToUse);
      
      setActivities(result.activities);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const refreshActivities = async () => {
    setRefreshing(true);
    await loadActivities();
  };

  useEffect(() => {
    loadActivities();
    
    unsubscribeRef.current = activityFeedService.subscribeToActivityFeed(
      sessionId,
      (newActivities) => {
        setActivities(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          const uniqueNewActivities = newActivities.filter(a => !existingIds.has(a.id));
          return [...uniqueNewActivities, ...prev].slice(0, filter.limit || 50);
        });
      }
    );

    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(refreshActivities, refreshInterval);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [sessionId]);

  if (isLoading && activities.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center text-gray-600 mt-2">Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Activity Feed</h3>
        <div className="flex items-center space-x-2">
          {refreshing && (
            <ArrowPathIcon className="w-4 h-4 text-gray-400 animate-spin" />
          )}
          <button
            onClick={refreshActivities}
            disabled={refreshing}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className={`${maxHeight} overflow-y-auto`}>
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <div className="flex items-center">
              <XCircleIcon className="w-5 h-5 text-red-400" />
              <p className="ml-3 text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {activities.length === 0 && !isLoading && (
          <div className="p-8 text-center">
            <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No activities yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Activity will appear here as users interact with the session
            </p>
          </div>
        )}

        {activities.length > 0 && (
          <div className="relative">
            <div className="space-y-0">
              {activities.map((activity, index) => (
                <div key={activity.id} className="relative px-4">
                  <ActivityItemComponent
                    activity={activity}
                    isFirst={index === 0}
                    isLast={index === activities.length - 1}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};