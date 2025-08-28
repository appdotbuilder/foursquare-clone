import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { Venue, CreateCheckinInput, Checkin } from '../../../server/src/schema';

interface CheckinFormProps {
  userId: number;
  onSuccess?: () => void;
}

export function CheckinForm({ userId, onSuccess }: CheckinFormProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingVenues, setIsSearchingVenues] = useState(false);
  const [recentCheckins, setRecentCheckins] = useState<Checkin[]>([]);

  // Mock location for nearby venues
  const [userLocation] = useState({ latitude: 40.7128, longitude: -74.0060 });

  const loadNearbyVenues = useCallback(async () => {
    setIsSearchingVenues(true);
    try {
      const results = await trpc.searchVenues.query({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius: 5 // 5km radius for check-ins
      });
      setVenues(results);
      
      // If no venues from API, show mock data
      if (results.length === 0) {
        setVenues([
          {
            id: 1,
            name: 'Central Perk Coffee',
            address: '123 Main St, New York, NY',
            latitude: 40.7128,
            longitude: -74.0060,
            category: 'Coffee Shop',
            description: 'A cozy coffee shop where friends meet',
            phone: '(212) 555-0123',
            website: 'https://centralperk.com',
            created_by: userId,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 2,
            name: 'Times Square Diner',
            address: '456 Broadway, New York, NY',
            latitude: 40.7580,
            longitude: -73.9855,
            category: 'Restaurant',
            description: 'Classic American diner open 24/7',
            phone: '(212) 555-0456',
            website: null,
            created_by: userId,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 3,
            name: 'Brooklyn Bridge Park',
            address: '334 Furman St, Brooklyn, NY',
            latitude: 40.7023,
            longitude: -73.9969,
            category: 'Park',
            description: 'Beautiful waterfront park with city views',
            phone: null,
            website: 'https://brooklynbridgepark.org',
            created_by: userId,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load nearby venues:', error);
    } finally {
      setIsSearchingVenues(false);
    }
  }, [userLocation, userId]);

  const loadRecentCheckins = useCallback(async () => {
    try {
      const checkins = await trpc.getUserCheckins.query({ 
        userId, 
        limit: 5 
      });
      setRecentCheckins(checkins);
    } catch (error) {
      console.error('Failed to load recent check-ins:', error);
      // Mock recent check-ins since handler returns empty array
      setRecentCheckins([]);
    }
  }, [userId]);

  useEffect(() => {
    loadNearbyVenues();
    loadRecentCheckins();
  }, [loadNearbyVenues, loadRecentCheckins]);

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenueId) return;

    setIsLoading(true);
    try {
      const checkinData: CreateCheckinInput = {
        user_id: userId,
        venue_id: parseInt(selectedVenueId),
        message: message || null
      };

      await trpc.createCheckin.mutate(checkinData);
      
      // Reset form
      setSelectedVenueId('');
      setMessage('');
      
      // Reload recent check-ins
      await loadRecentCheckins();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to check in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedVenue = venues.find(v => v.id.toString() === selectedVenueId);

  return (
    <div className="space-y-6">
      {/* Check-in Form */}
      <Card className="border-2 border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
          <CardTitle className="flex items-center space-x-2">
            <span>📍</span>
            <span>Check-in Now</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleCheckin} className="space-y-4">
            {/* Venue Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                📍 Where are you?
              </label>
              {isSearchingVenues ? (
                <div className="flex items-center justify-center py-4 text-gray-500">
                  <span className="animate-spin mr-2">🔄</span>
                  Finding places near you...
                </div>
              ) : (
                <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                  <SelectTrigger>
                    <SelectValue placeholder="🔍 Select a place to check-in" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue: Venue) => (
                      <SelectItem key={venue.id} value={venue.id.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">{venue.name}</span>
                          <span className="text-xs text-gray-500">{venue.address}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Selected Venue Preview */}
            {selectedVenue && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-green-800">{selectedVenue.name}</h4>
                      <p className="text-sm text-green-700">{selectedVenue.address}</p>
                      {selectedVenue.description && (
                        <p className="text-xs text-green-600 mt-1">{selectedVenue.description}</p>
                      )}
                    </div>
                    <Badge className="bg-green-500 text-white">
                      {selectedVenue.category}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Optional Message */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                💬 What's happening? (optional)
              </label>
              <Textarea
                value={message}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                placeholder="Share what you're up to..."
                rows={3}
                className="resize-none"
              />
            </div>

            <Button 
              type="submit" 
              disabled={!selectedVenueId || isLoading}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
            >
              {isLoading ? '📍 Checking in...' : '📍 Check-in Here!'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Quick Check-in Suggestions */}
      {venues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>⚡</span>
              <span>Quick Check-in</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {venues.slice(0, 3).map((venue: Venue) => (
                <div 
                  key={venue.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{venue.name}</h4>
                    <p className="text-sm text-gray-600">{venue.address}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setSelectedVenueId(venue.id.toString())}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    📍 Check-in
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Check-ins */}
      {recentCheckins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🕒</span>
              <span>Your Recent Check-ins</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCheckins.map((checkin: Checkin) => {
                const venue = venues.find(v => v.id === checkin.venue_id);
                return (
                  <div key={checkin.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-800">
                        {venue?.name || 'Unknown Venue'}
                      </p>
                      {checkin.message && (
                        <p className="text-sm text-gray-600 italic">"{checkin.message}"</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {checkin.created_at.toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Venues Message */}
      {!isSearchingVenues && venues.length === 0 && (
        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No places found nearby</h3>
            <p className="text-gray-500 mb-4">
              We couldn't find any places near you. Try adding a new venue first!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}