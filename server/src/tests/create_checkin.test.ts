import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { checkinsTable, usersTable, venuesTable } from '../db/schema';
import { type CreateCheckinInput } from '../schema';
import { createCheckin } from '../handlers/create_checkin';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  bio: 'Test bio',
  profile_image_url: 'https://example.com/avatar.jpg'
};

// Test venue data  
const testVenue = {
  name: 'Test Venue',
  address: '123 Test Street',
  latitude: 40.7128,
  longitude: -74.0060,
  category: 'Restaurant',
  description: 'A test venue',
  phone: '+1234567890',
  website: 'https://testvenue.com',
  created_by: 0 // Will be set to actual user ID
};

describe('createCheckin', () => {
  let userId: number;
  let venueId: number;

  beforeEach(async () => {
    await createDB();

    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create prerequisite venue
    const venueResult = await db.insert(venuesTable)
      .values({
        ...testVenue,
        created_by: userId
      })
      .returning()
      .execute();
    venueId = venueResult[0].id;
  });

  afterEach(resetDB);

  it('should create a check-in with message', async () => {
    const testInput: CreateCheckinInput = {
      user_id: userId,
      venue_id: venueId,
      message: 'Great food here!'
    };

    const result = await createCheckin(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(userId);
    expect(result.venue_id).toEqual(venueId);
    expect(result.message).toEqual('Great food here!');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a check-in without message', async () => {
    const testInput: CreateCheckinInput = {
      user_id: userId,
      venue_id: venueId
    };

    const result = await createCheckin(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(userId);
    expect(result.venue_id).toEqual(venueId);
    expect(result.message).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save check-in to database', async () => {
    const testInput: CreateCheckinInput = {
      user_id: userId,
      venue_id: venueId,
      message: 'Amazing experience!'
    };

    const result = await createCheckin(testInput);

    // Query the database to verify record was saved
    const checkins = await db.select()
      .from(checkinsTable)
      .where(eq(checkinsTable.id, result.id))
      .execute();

    expect(checkins).toHaveLength(1);
    expect(checkins[0].user_id).toEqual(userId);
    expect(checkins[0].venue_id).toEqual(venueId);
    expect(checkins[0].message).toEqual('Amazing experience!');
    expect(checkins[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const testInput: CreateCheckinInput = {
      user_id: 99999, // Non-existent user ID
      venue_id: venueId,
      message: 'This should fail'
    };

    await expect(createCheckin(testInput)).rejects.toThrow(/User with id 99999 does not exist/i);
  });

  it('should throw error for non-existent venue', async () => {
    const testInput: CreateCheckinInput = {
      user_id: userId,
      venue_id: 99999, // Non-existent venue ID
      message: 'This should also fail'
    };

    await expect(createCheckin(testInput)).rejects.toThrow(/Venue with id 99999 does not exist/i);
  });

  it('should handle null message properly', async () => {
    const testInput: CreateCheckinInput = {
      user_id: userId,
      venue_id: venueId,
      message: null
    };

    const result = await createCheckin(testInput);

    expect(result.user_id).toEqual(userId);
    expect(result.venue_id).toEqual(venueId);
    expect(result.message).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify in database
    const checkins = await db.select()
      .from(checkinsTable)
      .where(eq(checkinsTable.id, result.id))
      .execute();

    expect(checkins[0].message).toBeNull();
  });

  it('should create multiple check-ins for same user and venue', async () => {
    const testInput1: CreateCheckinInput = {
      user_id: userId,
      venue_id: venueId,
      message: 'First visit'
    };

    const testInput2: CreateCheckinInput = {
      user_id: userId,
      venue_id: venueId,
      message: 'Second visit'
    };

    const result1 = await createCheckin(testInput1);
    const result2 = await createCheckin(testInput2);

    // Both should succeed with different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.message).toEqual('First visit');
    expect(result2.message).toEqual('Second visit');

    // Verify both exist in database
    const allCheckins = await db.select()
      .from(checkinsTable)
      .where(eq(checkinsTable.user_id, userId))
      .execute();

    expect(allCheckins).toHaveLength(2);
  });
});