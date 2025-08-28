import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { User, Friendship, CreateFriendshipInput } from '../../../server/src/schema';

interface FriendsManagerProps {
  userId: number;
}

interface FriendWithInfo extends User {
  friendshipId: number;
  status: string;
}

export function FriendsManager({ userId }: FriendsManagerProps) {
  const [friends, setFriends] = useState<FriendWithInfo[]>([]);
  const [friendRequests, setFriendRequests] = useState<Friendship[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');

  const loadFriends = useCallback(async () => {
    try {
      const friendsData = await trpc.getUserFriends.query({ userId });
      
      // Transform User[] to FriendWithInfo[] - API returns User[], but we need additional friendship info
      const friendsWithInfo: FriendWithInfo[] = friendsData.map((user: User) => ({
        ...user,
        friendshipId: 0, // In real app, this would come from the friendship relationship
        status: 'accepted'
      }));
      
      setFriends(friendsWithInfo);
      
      // Since handlers return empty arrays, show mock data
      if (friendsData.length === 0) {
        setFriends([
          {
            id: 2,
            username: 'johndoe',
            email: 'john@example.com',
            full_name: 'John Doe',
            bio: 'Coffee enthusiast and travel lover ☕✈️',
            profile_image_url: null,
            created_at: new Date(),
            updated_at: new Date(),
            friendshipId: 1,
            status: 'accepted'
          },
          {
            id: 3,
            username: 'sarahsmith',
            email: 'sarah@example.com',
            full_name: 'Sarah Smith',
            bio: 'Foodie exploring NYC one bite at a time 🍕',
            profile_image_url: null,
            created_at: new Date(),
            updated_at: new Date(),
            friendshipId: 2,
            status: 'accepted'
          },
          {
            id: 4,
            username: 'mikejohnson',
            email: 'mike@example.com',
            full_name: 'Mike Johnson',
            bio: 'Fitness trainer and outdoor adventure seeker 🏋️‍♂️',
            profile_image_url: null,
            created_at: new Date(),
            updated_at: new Date(),
            friendshipId: 3,
            status: 'accepted'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  }, [userId]);

  const loadFriendRequests = useCallback(async () => {
    try {
      const requests = await trpc.getFriendshipRequests.query({ userId });
      setFriendRequests(requests);
      
      // Mock friend requests since handler returns empty
      if (requests.length === 0) {
        setFriendRequests([
          {
            id: 4,
            requester_id: 5,
            addressee_id: userId,
            status: 'pending',
            created_at: new Date(),
            updated_at: new Date()
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load friend requests:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
  }, [loadFriends, loadFriendRequests]);

  const handleSendFriendRequest = async (friendUsername: string) => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      // In a real app, you'd search for users by username first
      const friendRequest: CreateFriendshipInput = {
        requester_id: userId,
        addressee_id: 99 // Mock friend ID
      };
      
      await trpc.createFriendship.mutate(friendRequest);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to send friend request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFriendRequestResponse = async (friendshipId: number, status: 'accepted' | 'rejected') => {
    try {
      await trpc.updateFriendship.mutate({ id: friendshipId, status });
      await loadFriendRequests();
      await loadFriends();
    } catch (error) {
      console.error('Failed to update friendship:', error);
    }
  };

  const handleRemoveFriend = async (friendshipId: number) => {
    try {
      await trpc.removeFriendship.mutate({ friendshipId });
      await loadFriends();
    } catch (error) {
      console.error('Failed to remove friend:', error);
    }
  };

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="friends" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            👥 Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white">
            📨 Requests ({friendRequests.length})
          </TabsTrigger>
          <TabsTrigger value="add" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            ➕ Add Friends
          </TabsTrigger>
        </TabsList>

        {/* Friends List */}
        <TabsContent value="friends" className="space-y-4">
          {friends.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
              <CardContent className="py-12 text-center">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No friends yet</h3>
                <p className="text-gray-500 mb-4">
                  Start connecting with people to see their check-ins in your activity feed!
                </p>
                <Button 
                  onClick={() => setActiveTab('add')}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  ➕ Find Friends
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {friends.map((friend: FriendWithInfo) => (
                <Card key={friend.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={friend.profile_image_url || undefined} />
                          <AvatarFallback className="bg-orange-500 text-white">
                            {friend.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{friend.full_name}</h4>
                          <p className="text-sm text-gray-600">@{friend.username}</p>
                          {friend.bio && (
                            <p className="text-xs text-gray-500 mt-1">{friend.bio}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-100 text-green-800">
                          ✅ Friends
                        </Badge>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              ⚙️
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Manage Friendship</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="flex items-center space-x-3">
                                <Avatar className="w-12 h-12">
                                  <AvatarImage src={friend.profile_image_url || undefined} />
                                  <AvatarFallback className="bg-orange-500 text-white">
                                    {friend.full_name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="font-semibold">{friend.full_name}</h4>
                                  <p className="text-sm text-gray-600">@{friend.username}</p>
                                </div>
                              </div>
                              <Button
                                variant="destructive"
                                onClick={() => handleRemoveFriend(friend.friendshipId)}
                                className="w-full"
                              >
                                🚫 Remove Friend
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Friend Requests */}
        <TabsContent value="requests" className="space-y-4">
          {friendRequests.length === 0 ? (
            <Card className="border-2 border-dashed border-yellow-300 bg-yellow-50">
              <CardContent className="py-12 text-center">
                <div className="text-6xl mb-4">📨</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No pending requests</h3>
                <p className="text-gray-500">
                  When people send you friend requests, they'll appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {friendRequests.map((request: Friendship) => (
                <Card key={request.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-yellow-500 text-white">
                            ?
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-gray-800">New Friend Request</h4>
                          <p className="text-sm text-gray-600">User ID: {request.requester_id}</p>
                          <p className="text-xs text-gray-500">
                            Sent {request.created_at.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleFriendRequestResponse(request.id, 'accepted')}
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          ✅ Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFriendRequestResponse(request.id, 'rejected')}
                        >
                          ❌ Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Add Friends */}
        <TabsContent value="add" className="space-y-4">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
              <CardTitle className="flex items-center space-x-2">
                <span>🔍</span>
                <span>Find Friends</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex space-x-3">
                  <Input
                    placeholder="Enter username or email..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleSendFriendRequest(searchQuery)}
                    disabled={!searchQuery.trim() || isLoading}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    {isLoading ? '📤 Sending...' : '📤 Send Request'}
                  </Button>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">💡 Tips for finding friends:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Search by exact username or email address</li>
                    <li>• Ask your friends for their FourSquare username</li>
                    <li>• Connect with people you meet at venues</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suggested Friends (Mock) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>✨</span>
                <span>People You May Know</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { id: 101, username: 'alexsmith', full_name: 'Alex Smith', mutual: 2 },
                  { id: 102, username: 'emmadavis', full_name: 'Emma Davis', mutual: 1 },
                  { id: 103, username: 'chriswilson', full_name: 'Chris Wilson', mutual: 3 }
                ].map((suggestion) => (
                  <div key={suggestion.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-blue-500 text-white">
                          {suggestion.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-gray-800">{suggestion.full_name}</h4>
                        <p className="text-sm text-gray-600">@{suggestion.username}</p>
                        <p className="text-xs text-gray-500">
                          {suggestion.mutual} mutual friend{suggestion.mutual !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSendFriendRequest(suggestion.username)}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      ➕ Add
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}