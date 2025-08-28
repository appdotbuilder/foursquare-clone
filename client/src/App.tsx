import './App.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import { UserProfile as UserProfileComponent } from './components/UserProfile';
import { VenueExplorer } from './components/VenueExplorer';
import { CheckinForm } from './components/CheckinForm';
import { FriendsManager } from './components/FriendsManager';
import { ActivityFeed } from './components/ActivityFeed';
// Using type-only imports for better TypeScript compliance
import type { UserProfile, Venue, ActivityFeedItem } from '../../server/src/schema';

function App() {
  const [currentUserId] = useState<number>(1); // Mock current user
  const [selectedTab, setSelectedTab] = useState<string>('feed');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load current user profile
  const loadUserProfile = useCallback(async () => {
    try {
      const profile = await trpc.getUserProfile.query({ userId: currentUserId });
      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header with 2012 Foursquare-style branding */}
      <header className="bg-white shadow-sm border-b-2 border-blue-500">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-sm flex items-center justify-center">
                <span className="text-white font-bold text-lg">4️⃣</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">FourSquare Clone</h1>
            </div>
            
            {userProfile && (
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  ✅ {userProfile.checkin_count} check-ins
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  👥 {userProfile.friend_count} friends
                </Badge>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={userProfile.profile_image_url || undefined} />
                  <AvatarFallback className="bg-blue-500 text-white">
                    {userProfile.full_name.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6 bg-white shadow-sm">
            <TabsTrigger value="feed" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              🏠 Feed
            </TabsTrigger>
            <TabsTrigger value="checkin" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              📍 Check-in
            </TabsTrigger>
            <TabsTrigger value="explore" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              🔍 Explore
            </TabsTrigger>
            <TabsTrigger value="friends" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              👥 Friends
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
              👤 Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4">
            <Card className="border-l-4 border-l-blue-500 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                <CardTitle className="flex items-center space-x-2">
                  <span>🏠</span>
                  <span>Activity Feed</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ActivityFeed userId={currentUserId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkin" className="space-y-4">
            <Card className="border-l-4 border-l-green-500 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
                <CardTitle className="flex items-center space-x-2">
                  <span>📍</span>
                  <span>Check-in to a Place</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <CheckinForm userId={currentUserId} onSuccess={loadUserProfile} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="explore" className="space-y-4">
            <Card className="border-l-4 border-l-purple-500 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                <CardTitle className="flex items-center space-x-2">
                  <span>🔍</span>
                  <span>Discover Places</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <VenueExplorer userId={currentUserId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="friends" className="space-y-4">
            <Card className="border-l-4 border-l-orange-500 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                <CardTitle className="flex items-center space-x-2">
                  <span>👥</span>
                  <span>Friends</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <FriendsManager userId={currentUserId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <Card className="border-l-4 border-l-pink-500 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-pink-50 to-pink-100">
                <CardTitle className="flex items-center space-x-2">
                  <span>👤</span>
                  <span>My Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <UserProfileComponent userId={currentUserId} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer with 2012 aesthetic */}
      <footer className="bg-gray-800 text-white py-4 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            Made with ❤️ in 2012 style • 
            <span className="mx-2">📱</span>
            FourSquare Clone • 
            <span className="mx-2">🌟</span>
            Discover places around you!
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;