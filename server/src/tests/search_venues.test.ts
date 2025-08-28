import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, venuesTable } from '../db/schema';
import { type SearchVenuesInput, type CreateUserInput, type CreateVenueInput } from '../schema';
import { searchVenues } from '../handlers/search_venues';

// Test user data
const testUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User'
};

// Test venues at different locations around NYC
const testVenues: (Omit<CreateVenueInput, 'created_by'> & { expectedDistance?: number })[] = [
  {
    name: 'Central Park Cafe',
    address: '123 Central Park West, NYC',
    latitude: 40.7829,
    longitude: -73.9654,
    category: 'restaurant',
    description: 'A lovely cafe in Central Park',
    expectedDistance: 0 // Very close to search point
  },
  {
    name: 'Brooklyn Bridge Diner',
    address: '456 Brooklyn Bridge Blvd, NYC',
    latitude: 40.7061,
    longitude: -73.9969,
    category: 'restaurant',
    description: 'Classic NYC diner near Brooklyn Bridge'
  },
  {
    name: 'Times Square Theater',
    address: '789 Broadway, NYC',
    latitude: 40.7580,
    longitude: -73.9855,
    category: 'entertainment',
    description: 'Broadway theater in Times Square'
  },
  {
    name: 'Far Away Venue',
    address: '999 Far Street, NYC',
    latitude: 40.8500, // Much further north
    longitude: -73.8500, // Much further east
    category: 'restaurant',
    description: 'A restaurant very far away'
  }
];

const searchInput: SearchVenuesInput = {
  latitude: 40.7831, // Near Central Park
  longitude: -73.9712,
  radius: 10 // 10km radius
};

describe('searchVenues', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should search for venues within radius', async () => {
    // Create test user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test venues
    const venuesWithCreatedBy = testVenues.map(venue => ({
      ...venue,
      created_by: user.id
    }));

    await db.insert(venuesTable)
      .values(venuesWithCreatedBy)
      .execute();

    const results = await searchVenues(searchInput);

    // Should return venues within radius, ordered by distance
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(4);

    // First result should be the closest (Central Park Cafe)
    expect(results[0].name).toBe('Central Park Cafe');

    // All results should have required fields
    results.forEach(venue => {
      expect(venue.id).toBeDefined();
      expect(venue.name).toBeDefined();
      expect(venue.address).toBeDefined();
      expect(typeof venue.latitude).toBe('number');
      expect(typeof venue.longitude).toBe('number');
      expect(venue.category).toBeDefined();
      expect(venue.created_by).toBe(user.id);
      expect(venue.created_at).toBeInstanceOf(Date);
      expect(venue.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should filter by category', async () => {
    // Create test user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test venues
    const venuesWithCreatedBy = testVenues.map(venue => ({
      ...venue,
      created_by: user.id
    }));

    await db.insert(venuesTable)
      .values(venuesWithCreatedBy)
      .execute();

    const searchWithCategory: SearchVenuesInput = {
      ...searchInput,
      category: 'restaurant'
    };

    const results = await searchVenues(searchWithCategory);

    // Should only return restaurants
    expect(results.length).toBeGreaterThan(0);
    results.forEach(venue => {
      expect(venue.category).toBe('restaurant');
    });

    // Should not include the theater
    const theaterFound = results.find(v => v.name === 'Times Square Theater');
    expect(theaterFound).toBeUndefined();
  });

  it('should filter by text query', async () => {
    // Create test user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test venues
    const venuesWithCreatedBy = testVenues.map(venue => ({
      ...venue,
      created_by: user.id
    }));

    await db.insert(venuesTable)
      .values(venuesWithCreatedBy)
      .execute();

    const searchWithQuery: SearchVenuesInput = {
      ...searchInput,
      query: 'Broadway'
    };

    const results = await searchVenues(searchWithQuery);

    // Should only return venues matching the query
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Times Square Theater');
    expect(results[0].description).toContain('Broadway');
  });

  it('should respect radius limits', async () => {
    // Create test user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test venues
    const venuesWithCreatedBy = testVenues.map(venue => ({
      ...venue,
      created_by: user.id
    }));

    await db.insert(venuesTable)
      .values(venuesWithCreatedBy)
      .execute();

    // Search with very small radius
    const smallRadiusSearch: SearchVenuesInput = {
      ...searchInput,
      radius: 1 // 1km radius
    };

    const results = await searchVenues(smallRadiusSearch);

    // Should only return very close venues
    expect(results.length).toBeGreaterThan(0);
    
    // Should definitely include Central Park Cafe (very close)
    const centralParkCafe = results.find(v => v.name === 'Central Park Cafe');
    expect(centralParkCafe).toBeDefined();

    // Should not include the far away venue
    const farVenue = results.find(v => v.name === 'Far Away Venue');
    expect(farVenue).toBeUndefined();
  });

  it('should use default radius when not provided', async () => {
    // Create test user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create just one close venue
    await db.insert(venuesTable)
      .values({
        name: 'Test Venue',
        address: 'Test Address',
        latitude: searchInput.latitude,
        longitude: searchInput.longitude,
        category: 'test',
        created_by: user.id
      })
      .execute();

    const searchWithoutRadius: SearchVenuesInput = {
      latitude: searchInput.latitude,
      longitude: searchInput.longitude
    };

    const results = await searchVenues(searchWithoutRadius);

    // Should work with default radius (10km)
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Test Venue');
  });

  it('should combine category and query filters', async () => {
    // Create test user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test venues
    const venuesWithCreatedBy = testVenues.map(venue => ({
      ...venue,
      created_by: user.id
    }));

    await db.insert(venuesTable)
      .values(venuesWithCreatedBy)
      .execute();

    const combinedSearch: SearchVenuesInput = {
      ...searchInput,
      category: 'restaurant',
      query: 'cafe'
    };

    const results = await searchVenues(combinedSearch);

    // Should only return restaurants matching 'cafe' query
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Central Park Cafe');
    expect(results[0].category).toBe('restaurant');
  });

  it('should return empty array when no venues match criteria', async () => {
    // Create test user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create venues but search in completely different location
    const venuesWithCreatedBy = testVenues.map(venue => ({
      ...venue,
      created_by: user.id
    }));

    await db.insert(venuesTable)
      .values(venuesWithCreatedBy)
      .execute();

    const farAwaySearch: SearchVenuesInput = {
      latitude: 35.6762, // Tokyo coordinates
      longitude: 139.6503,
      radius: 5
    };

    const results = await searchVenues(farAwaySearch);

    expect(results).toHaveLength(0);
  });

  it('should handle venues with null descriptions in text search', async () => {
    // Create test user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create venue with null description
    await db.insert(venuesTable)
      .values({
        name: 'Broadway Venue',
        address: 'Test Address',
        latitude: searchInput.latitude,
        longitude: searchInput.longitude,
        category: 'test',
        description: null, // Explicitly null
        created_by: user.id
      })
      .execute();

    const searchWithQuery: SearchVenuesInput = {
      ...searchInput,
      query: 'Broadway'
    };

    const results = await searchVenues(searchWithQuery);

    // Should find venue by name even with null description
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Broadway Venue');
    expect(results[0].description).toBeNull();
  });
});