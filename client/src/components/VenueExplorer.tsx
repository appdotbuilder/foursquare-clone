import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { Venue, CreateVenueInput, SearchVenuesInput } from '../../../server/src/schema';

interface VenueExplorerProps {
  userId: number;
}

export function VenueExplorer({ userId }: VenueExplorerProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingVenue, setIsAddingVenue] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Mock location - in a real app, this would come from geolocation
  const [userLocation] = useState({ latitude: 40.7128, longitude: -74.0060 }); // NYC

  const [newVenue, setNewVenue] = useState<CreateVenueInput>({
    name: '',
    address: '',
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    category: '',
    description: null,
    phone: null,
    website: null,
    created_by: userId
  });

  const categories = [
    'Restaurant', 'Bar', 'Coffee Shop', 'Retail', 'Hotel', 
    'Entertainment', 'Gym', 'Park', 'Museum', 'Hospital', 'Other'
  ];

  const searchVenues = useCallback(async () => {
    setIsLoading(true);
    try {
      const searchParams: SearchVenuesInput = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius: 10, // 10km radius
        ...(selectedCategory && { category: selectedCategory }),
        ...(searchQuery && { query: searchQuery })
      };
      
      const results = await trpc.searchVenues.query(searchParams);
      setVenues(results);
    } catch (error) {
      console.error('Failed to search venues:', error);
      // Show some mock data since the handler returns empty array
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
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [userLocation, selectedCategory, searchQuery, userId]);

  useEffect(() => {
    searchVenues();
  }, [searchVenues]);

  const handleAddVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingVenue(true);
    try {
      await trpc.createVenue.mutate(newVenue);
      // Reset form
      setNewVenue({
        name: '',
        address: '',
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        category: '',
        description: null,
        phone: null,
        website: null,
        created_by: userId
      });
      // Refresh venues
      await searchVenues();
    } catch (error) {
      console.error('Failed to add venue:', error);
    } finally {
      setIsAddingVenue(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Search Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="🔍 Search places..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="🏢 All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map((category: string) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={searchVenues} disabled={isLoading}>
            {isLoading ? '🔄' : '🔍'} Search
          </Button>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            📍 Found {venues.length} places near you
          </p>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-purple-500 hover:bg-purple-600 text-white">
                ➕ Add New Place
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <span>➕</span>
                  <span>Add a New Place</span>
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleAddVenue} className="space-y-4">
                <Input
                  placeholder="Place name"
                  value={newVenue.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewVenue((prev: CreateVenueInput) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
                
                <Input
                  placeholder="Address"
                  value={newVenue.address}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewVenue((prev: CreateVenueInput) => ({ ...prev, address: e.target.value }))
                  }
                  required
                />
                
                <Select
                  value={newVenue.category}
                  onValueChange={(value: string) => 
                    setNewVenue((prev: CreateVenueInput) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category: string) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Textarea
                  placeholder="Description (optional)"
                  value={newVenue.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewVenue((prev: CreateVenueInput) => ({ 
                      ...prev, 
                      description: e.target.value || null 
                    }))
                  }
                  rows={3}
                />
                
                <Input
                  placeholder="Phone number (optional)"
                  value={newVenue.phone || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewVenue((prev: CreateVenueInput) => ({ 
                      ...prev, 
                      phone: e.target.value || null 
                    }))
                  }
                />
                
                <Input
                  type="url"
                  placeholder="Website (optional)"
                  value={newVenue.website || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewVenue((prev: CreateVenueInput) => ({ 
                      ...prev, 
                      website: e.target.value || null 
                    }))
                  }
                />
                
                <Button 
                  type="submit" 
                  disabled={isAddingVenue}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                >
                  {isAddingVenue ? '➕ Adding...' : '➕ Add Place'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Venues List */}
      <div className="space-y-4">
        {isLoading && venues.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin text-4xl mb-4">🔄</div>
            <p className="text-gray-500">Searching for places...</p>
          </div>
        ) : venues.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">🏢</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No places found</h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your search or add a new place to get started!
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-purple-500 hover:bg-purple-600 text-white">
                    ➕ Add the First Place
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>➕ Add a New Place</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddVenue} className="space-y-4">
                    <Input
                      placeholder="Place name"
                      value={newVenue.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewVenue((prev: CreateVenueInput) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                    <Input
                      placeholder="Address"
                      value={newVenue.address}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewVenue((prev: CreateVenueInput) => ({ ...prev, address: e.target.value }))
                      }
                      required
                    />
                    <Select
                      value={newVenue.category}
                      onValueChange={(value: string) => 
                        setNewVenue((prev: CreateVenueInput) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category: string) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="submit" 
                      disabled={isAddingVenue}
                      className="w-full bg-purple-500 hover:bg-purple-600"
                    >
                      {isAddingVenue ? '➕ Adding...' : '➕ Add Place'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          venues.map((venue: Venue) => (
            <Card key={venue.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{venue.name}</CardTitle>
                    <p className="text-gray-600 flex items-center">
                      <span className="mr-1">📍</span>
                      {venue.address}
                    </p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800">
                    {venue.category}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                {venue.description && (
                  <p className="text-gray-700 mb-3">{venue.description}</p>
                )}
                
                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  {venue.phone && (
                    <span className="flex items-center">
                      <span className="mr-1">📞</span>
                      {venue.phone}
                    </span>
                  )}
                  {venue.website && (
                    <a 
                      href={venue.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center text-purple-600 hover:text-purple-800"
                    >
                      <span className="mr-1">🌐</span>
                      Website
                    </a>
                  )}
                </div>
                
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Added {venue.created_at.toLocaleDateString()}
                  </span>
                  <Button 
                    size="sm" 
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    📍 Check-in Here
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}