import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { UserProfile as UserProfileType, UpdateUserInput } from '../../../server/src/schema';

interface UserProfileProps {
  userId: number;
}

export function UserProfile({ userId }: UserProfileProps) {
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UpdateUserInput>({
    id: userId,
    username: '',
    email: '',
    full_name: '',
    bio: null,
    profile_image_url: null
  });

  const loadProfile = useCallback(async () => {
    try {
      const result = await trpc.getUserProfile.query({ userId });
      if (result) {
        setProfile(result);
        setFormData({
          id: result.id,
          username: result.username,
          email: result.email,
          full_name: result.full_name,
          bio: result.bio,
          profile_image_url: result.profile_image_url
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.updateUser.mutate(formData);
      await loadProfile(); // Reload the updated profile
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        id: profile.id,
        username: profile.username,
        email: profile.email,
        full_name: profile.full_name,
        bio: profile.bio,
        profile_image_url: profile.profile_image_url
      });
    }
    setIsEditing(false);
  };

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <div className="animate-pulse">
          <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col items-center space-y-4">
        <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
          <AvatarImage src={profile.profile_image_url || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-2xl">
            {profile.full_name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">{profile.full_name}</h2>
          <p className="text-gray-600">@{profile.username}</p>
          {profile.bio && (
            <p className="text-sm text-gray-700 mt-2 max-w-md">{profile.bio}</p>
          )}
        </div>

        <div className="flex space-x-3">
          <Badge className="bg-blue-500 text-white px-3 py-1">
            ✅ {profile.checkin_count} Check-ins
          </Badge>
          <Badge className="bg-purple-500 text-white px-3 py-1">
            🏢 {profile.venue_count} Venues
          </Badge>
          <Badge className="bg-green-500 text-white px-3 py-1">
            👥 {profile.friend_count} Friends
          </Badge>
        </div>

        <Button 
          onClick={() => setIsEditing(!isEditing)}
          className="bg-pink-500 hover:bg-pink-600 text-white"
        >
          {isEditing ? '❌ Cancel' : '✏️ Edit Profile'}
        </Button>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <Card className="border-2 border-pink-200">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-pink-100">
            <CardTitle className="text-pink-800">✏️ Edit Your Profile</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Username</label>
                  <Input
                    value={formData.username || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: UpdateUserInput) => ({ ...prev, username: e.target.value }))
                    }
                    placeholder="Your username"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: UpdateUserInput) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <Input
                  value={formData.full_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: UpdateUserInput) => ({ ...prev, full_name: e.target.value }))
                  }
                  placeholder="Your full name"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Bio</label>
                <Textarea
                  value={formData.bio || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: UpdateUserInput) => ({ ...prev, bio: e.target.value || null }))
                  }
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Profile Image URL</label>
                <Input
                  type="url"
                  value={formData.profile_image_url || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: UpdateUserInput) => ({ ...prev, profile_image_url: e.target.value || null }))
                  }
                  placeholder="https://example.com/your-photo.jpg"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-pink-500 hover:bg-pink-600 text-white"
                >
                  {isLoading ? '💾 Saving...' : '💾 Save Changes'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel}
                  className="border-pink-300 text-pink-700 hover:bg-pink-50"
                >
                  ❌ Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Profile Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-blue-700">{profile.checkin_count}</div>
            <div className="text-sm text-blue-600">Total Check-ins</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl mb-2">🏢</div>
            <div className="text-2xl font-bold text-purple-700">{profile.venue_count}</div>
            <div className="text-sm text-purple-600">Venues Added</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-green-700">{profile.friend_count}</div>
            <div className="text-sm text-green-600">Friends</div>
          </CardContent>
        </Card>
      </div>

      {/* Account Info */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-gray-700">📅 Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Member since:</strong> {profile.created_at.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Last updated:</strong> {profile.updated_at.toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}