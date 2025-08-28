import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, venuesTable } from '../db/schema';
import { type CreateUserInput, type CreateVenueInput } from '../schema';
import { getVenue } from '../handlers/get_venue';

// Test data
const testUser: CreateUserInput = {
  username: 'venueowner',
  email: 'owner@test.com',
  full_name: 'Venue Owner'
};

const testVenue: CreateVenueInput = {
  name: 'Test Restaurant',
  address: '123 Main Street, City, State',
  latitude: 40.7128,
  longitude: -74.0060,
  category: 'Restaurant',
  description: 'A great place to eat',
  phone: '+1-555-123-4567',
  website: 'https://testrestaurant.com',
  created_by: 1 // Will be set after user creation
};

describe('getVenue', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return venue when it exists', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        full_name: testUser.full_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create venue
    const venueResult = await db.insert(venuesTable)
      .values({
        name: testVenue.name,
        address: testVenue.address,
        latitude: testVenue.latitude,
        longitude: testVenue.longitude,
        category: testVenue.category,
        description: testVenue.description,
        phone: testVenue.phone,
        website: testVenue.website,
        created_by: userId
      })
      .returning()
      .execute();

    const venueId = venueResult[0].id;

    // Test the handler
    const result = await getVenue(venueId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(venueId);
    expect(result!.name).toBe('Test Restaurant');
    expect(result!.address).toBe('123 Main Street, City, State');
    expect(typeof result!.latitude).toBe('number');
    expect(typeof result!.longitude).toBe('number');
    expect(result!.latitude).toBe(40.7128);
    expect(result!.longitude).toBe(-74.0060);
    expect(result!.category).toBe('Restaurant');
    expect(result!.description).toBe('A great place to eat');
    expect(result!.phone).toBe('+1-555-123-4567');
    expect(result!.website).toBe('https://testrestaurant.com');
    expect(result!.created_by).toBe(userId);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when venue does not exist', async () => {
    const result = await getVenue(999);

    expect(result).toBeNull();
  });

  it('should handle venue with null optional fields', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        full_name: testUser.full_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create venue with minimal fields (null optional fields)
    const venueResult = await db.insert(venuesTable)
      .values({
        name: 'Simple Venue',
        address: '456 Oak Street',
        latitude: 37.7749,
        longitude: -122.4194,
        category: 'Cafe',
        created_by: userId
        // description, phone, website are intentionally omitted (will be null)
      })
      .returning()
      .execute();

    const venueId = venueResult[0].id;

    // Test the handler
    const result = await getVenue(venueId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(venueId);
    expect(result!.name).toBe('Simple Venue');
    expect(result!.address).toBe('456 Oak Street');
    expect(typeof result!.latitude).toBe('number');
    expect(typeof result!.longitude).toBe('number');
    expect(result!.latitude).toBe(37.7749);
    expect(result!.longitude).toBe(-122.4194);
    expect(result!.category).toBe('Cafe');
    expect(result!.description).toBeNull();
    expect(result!.phone).toBeNull();
    expect(result!.website).toBeNull();
    expect(result!.created_by).toBe(userId);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should handle coordinate precision correctly', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        full_name: testUser.full_name
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create venue with high precision coordinates
    const preciseLatitude = 40.123456789;
    const preciseLongitude = -74.987654321;

    const venueResult = await db.insert(venuesTable)
      .values({
        name: 'Precise Location',
        address: '789 Precision Ave',
        latitude: preciseLatitude,
        longitude: preciseLongitude,
        category: 'Store',
        created_by: userId
      })
      .returning()
      .execute();

    const venueId = venueResult[0].id;

    // Test the handler
    const result = await getVenue(venueId);

    expect(result).not.toBeNull();
    expect(typeof result!.latitude).toBe('number');
    expect(typeof result!.longitude).toBe('number');
    
    // Real columns store finite precision, so we test reasonable precision
    expect(result!.latitude).toBeCloseTo(preciseLatitude, 5);
    expect(result!.longitude).toBeCloseTo(preciseLongitude, 5);
  });
});