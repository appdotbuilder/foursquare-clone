import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { venuesTable, usersTable } from '../db/schema';
import { type CreateVenueInput, type CreateUserInput } from '../schema';
import { createVenue } from '../handlers/create_venue';
import { eq } from 'drizzle-orm';

// Test user data for creating venue
const testUser: CreateUserInput = {
  username: 'venueowner',
  email: 'owner@example.com',
  full_name: 'Venue Owner',
  bio: 'I create great venues',
  profile_image_url: 'https://example.com/avatar.jpg'
};

// Test venue input
const testVenueInput: CreateVenueInput = {
  name: 'Test Coffee Shop',
  address: '123 Main St, City, State 12345',
  latitude: 40.7128,
  longitude: -74.0060,
  category: 'restaurant',
  description: 'A cozy coffee shop in the heart of the city',
  phone: '+1-555-0123',
  website: 'https://testcoffeeshop.com',
  created_by: 1 // Will be updated with actual user ID
};

describe('createVenue', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        full_name: testUser.full_name,
        bio: testUser.bio ?? null,
        profile_image_url: testUser.profile_image_url ?? null
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;
  });

  it('should create a venue successfully', async () => {
    const venueInput = { ...testVenueInput, created_by: testUserId };
    const result = await createVenue(venueInput);

    // Verify returned venue data
    expect(result.name).toEqual('Test Coffee Shop');
    expect(result.address).toEqual(testVenueInput.address);
    expect(result.latitude).toEqual(40.7128);
    expect(result.longitude).toEqual(-74.0060);
    expect(result.category).toEqual('restaurant');
    expect(result.description).toEqual(testVenueInput.description ?? null);
    expect(result.phone).toEqual(testVenueInput.phone ?? null);
    expect(result.website).toEqual(testVenueInput.website ?? null);
    expect(result.created_by).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save venue to database', async () => {
    const venueInput = { ...testVenueInput, created_by: testUserId };
    const result = await createVenue(venueInput);

    // Query venue from database
    const venues = await db.select()
      .from(venuesTable)
      .where(eq(venuesTable.id, result.id))
      .execute();

    expect(venues).toHaveLength(1);
    const savedVenue = venues[0];
    expect(savedVenue.name).toEqual('Test Coffee Shop');
    expect(savedVenue.address).toEqual(testVenueInput.address);
    expect(savedVenue.latitude).toEqual(40.7128);
    expect(savedVenue.longitude).toEqual(-74.0060);
    expect(savedVenue.category).toEqual('restaurant');
    expect(savedVenue.description).toEqual(testVenueInput.description ?? null);
    expect(savedVenue.phone).toEqual(testVenueInput.phone ?? null);
    expect(savedVenue.website).toEqual(testVenueInput.website ?? null);
    expect(savedVenue.created_by).toEqual(testUserId);
    expect(savedVenue.created_at).toBeInstanceOf(Date);
    expect(savedVenue.updated_at).toBeInstanceOf(Date);
  });

  it('should handle nullable fields correctly', async () => {
    const minimalVenueInput: CreateVenueInput = {
      name: 'Minimal Venue',
      address: '456 Simple St',
      latitude: 41.8781,
      longitude: -87.6298,
      category: 'other',
      created_by: testUserId
      // description, phone, website omitted (optional)
    };

    const result = await createVenue(minimalVenueInput);

    expect(result.name).toEqual('Minimal Venue');
    expect(result.address).toEqual('456 Simple St');
    expect(result.latitude).toEqual(41.8781);
    expect(result.longitude).toEqual(-87.6298);
    expect(result.category).toEqual('other');
    expect(result.description).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.website).toBeNull();
    expect(result.created_by).toEqual(testUserId);
  });

  it('should handle boundary coordinates correctly', async () => {
    const boundaryVenueInput: CreateVenueInput = {
      name: 'Boundary Venue',
      address: 'Edge of the World',
      latitude: 90.0, // Maximum latitude
      longitude: -180.0, // Minimum longitude
      category: 'landmark',
      created_by: testUserId
    };

    const result = await createVenue(boundaryVenueInput);

    expect(result.latitude).toEqual(90.0);
    expect(result.longitude).toEqual(-180.0);
    expect(result.name).toEqual('Boundary Venue');
    expect(result.category).toEqual('landmark');
  });

  it('should throw error when creating user does not exist', async () => {
    const venueInput = { ...testVenueInput, created_by: 99999 }; // Non-existent user ID

    await expect(createVenue(venueInput)).rejects.toThrow(/User with id 99999 does not exist/i);
  });

  it('should handle different venue categories', async () => {
    const categories = ['restaurant', 'bar', 'cafe', 'park', 'museum', 'other'];
    
    for (const category of categories) {
      const venueInput = {
        ...testVenueInput,
        name: `Test ${category} venue`,
        category,
        created_by: testUserId
      };

      const result = await createVenue(venueInput);
      expect(result.category).toEqual(category);
      expect(result.name).toEqual(`Test ${category} venue`);
    }
  });

  it('should preserve coordinate precision within database limits', async () => {
    const preciseVenueInput: CreateVenueInput = {
      name: 'Precise Location',
      address: '789 Precise Ave',
      latitude: 40.712896, // High precision
      longitude: -74.005974, // High precision
      category: 'restaurant',
      created_by: testUserId
    };

    const result = await createVenue(preciseVenueInput);

    // PostgreSQL real type has limited precision (~6-7 significant digits)
    // Use toBeCloseTo for floating point comparison
    expect(result.latitude).toBeCloseTo(40.712896, 5);
    expect(result.longitude).toBeCloseTo(-74.005974, 5);
  });

  it('should handle special characters in venue data', async () => {
    const specialCharVenueInput: CreateVenueInput = {
      name: "Joe's Café & Bistro",
      address: '123 Émile-Zola St, Montréal, QC H1A 1A1',
      latitude: 45.5017,
      longitude: -73.5673,
      category: 'restaurant',
      description: 'A café with ñoño & spéciał characters',
      phone: '+1 (514) 555-0123',
      website: 'https://joescafe.com/montréal',
      created_by: testUserId
    };

    const result = await createVenue(specialCharVenueInput);

    expect(result.name).toEqual("Joe's Café & Bistro");
    expect(result.address).toEqual('123 Émile-Zola St, Montréal, QC H1A 1A1');
    expect(result.description).toEqual('A café with ñoño & spéciał characters');
    expect(result.phone).toEqual('+1 (514) 555-0123');
    expect(result.website).toEqual('https://joescafe.com/montréal');
  });
});