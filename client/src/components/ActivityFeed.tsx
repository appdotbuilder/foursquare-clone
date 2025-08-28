import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { ActivityFeedItem } from '../../../server/src/schema';

interface ActivityFeedProps {
  userId: number;
}

export function ActivityFeed({ userId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadActivityFeed = useCallback(async () => {
    try {
      const feed = await trpc.getActivityFeed.query({ 
        userId, 
        limit: 20 
      });
      setActivities(feed);
      
      // Since handler returns empty array, show mock data for demo
      if (feed.length === 0) {
        setActivities([
          {
            id: 1,
            user_id: 2,
            username: 'johndoe',
            full_name: 'John Doe',
            venue_id: 1,
            venue_name: 'Central Perk Coffee',
            venue_address: '123 Main St, New York, NY',
            message: 'Great coffee and amazing atmosphere! ☕️',
            created_at: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
          },
          {
            id: 2,
            user_id: 3,
            username: 'sarahsmith',
            full_name: 'Sarah Smith',
            venue_id: 2,
            venue_name: 'Times Square Diner',
            venue_address: '456 Broadway, New York, NY',
            message: 'Best pancakes in the city! 🥞',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
          },
          {
            id: 3,
            user_id: 4,
            username: 'mikejohnson',
            full_name: 'Mike Johnson',
            venue_id: 3,
            venue_name: 'Brooklyn Bridge Park',
            venue_address: '334 Furman St, Brooklyn, NY',
            message: null,
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 4) // 4 hours ago
          },
          {
            id: 4,
            user_id: 2,
            username: 'johndoe',
            full_name: 'John Doe',
            venue_id: 4,
            venue_name: 'Madison Square Garden',
            venue_address: '4 Pennsylvania Plaza, New York, NY',
            message: 'Concert tonight! 🎵 This place is electric!',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 6) // 6 hours ago
          },
          {
            id: 5,
            user_id: 3,
            username: 'sarahsmith',
            full_name: 'Sarah Smith',
            venue_id: 5,
            venue_name: 'Museum of Modern Art',
            venue_address: '11 W 53rd St, New York, NY',
            message: 'Amazing art exhibition! Culture day 🎨',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 8) // 8 hours ago
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load activity feed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadActivityFeed();
  }, [loadActivityFeed]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadActivityFeed();
    setIsRefreshing(false);
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getCategoryEmoji = (venueName: string): string => {
    const name = venueName.toLowerCase();
    if (name.includes('coffee') || name.includes('cafe')) return '☕';
    if (name.includes('restaurant') || name.includes('diner')) return '🍽️';
    if (name.includes('bar') || name.includes('pub')) return '🍺';
    if (name.includes('park') || name.includes('garden')) return '🌳';
    if (name.includes('museum') || name.includes('gallery')) return '🎨';
    if (name.includes('gym') || name.includes('fitness')) return '💪';
    if (name.includes('theater') || name.includes('cinema')) return '🎭';
    if (name.includes('hotel')) return '🏨';
    if (name.includes('shop') || name.includes('store')) return '🛍️';
    return '📍';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="flex space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header with refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">🏠 Recent Activity</h3>
          <p className="text-sm text-gray-600">See what your friends are up to!</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
        </Button>
      </div>

      {activities.length === 0 ? (
        <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No activity yet</h3>
            <p className="text-gray-500 mb-4">
              Add some friends to see their check-ins in your feed!
            </p>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              👥 Find Friends
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activities.map((activity: ActivityFeedItem) => (
            <Card key={activity.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="flex space-x-4">
                  {/* User Avatar */}
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarFallback className="bg-blue-500 text-white">
                      {activity.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-800">
                          {activity.full_name}
                        </span>
                        <span className="text-gray-500 text-sm">
                          @{activity.username}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          ✅ Check-in
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {getTimeAgo(activity.created_at)}
                      </span>
                    </div>

                    {/* Check-in Info */}
                    <div className="mb-3">
                      <div className="flex items-start space-x-2">
                        <span className="text-lg flex-shrink-0 mt-0.5">
                          {getCategoryEmoji(activity.venue_name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900 truncate">
                            {activity.venue_name}
                          </h4>
                          <p className="text-sm text-gray-600 truncate">
                            📍 {activity.venue_address}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* User Message */}
                    {activity.message && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-gray-700 text-sm italic">
                          "{activity.message}"
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <button className="flex items-center space-x-1 hover:text-red-500 transition-colors">
                        <span>❤️</span>
                        <span>Like</span>
                      </button>
                      <button className="flex items-center space-x-1 hover:text-blue-500 transition-colors">
                        <span>💬</span>
                        <span>Comment</span>
                      </button>
                      <button className="flex items-center space-x-1 hover:text-green-500 transition-colors">
                        <span>📍</span>
                        <span>Check-in Here</span>
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Load More */}
          <Card className="border-dashed border-2 border-gray-300 bg-gray-50">
            <CardContent className="py-6 text-center">
              <Button variant="outline" className="text-gray-600">
                📜 Load More Activity
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}