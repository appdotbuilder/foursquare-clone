import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, venuesTable, checkinsTable } from '../db/schema';
import { getUserCheckins } from '../handlers/get_user_checkins';

// Test data
const testUser1 = {
  username: 'testuser1',
  email: 'test1@example.com',
  full_name: 'Test User One',
  bio: 'Test bio',
  profile_image_url: 'https://example.com/image1.jpg'
};

const testUser2 = {
  username: 'testuser2',
  email: 'test2@example.com',
  full_name: 'Test User Two',
  bio: null,
  profile_image_url: null
};

const testVenue = {
  name: 'Test Venue',
  address: '123 Test St',
  latitude: 40.7128,
  longitude: -74.0060,
  category: 'restaurant',
  description: 'A test venue',
  phone: '+1234567890',
  website: 'https://testvenue.com'
};

describe('getUserCheckins', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user checkins ordered by created_at DESC', async () => {
    // Create test user and venue
    const [user] = await db.insert(usersTable).values(testUser1).returning().execute();
    const [venue] = await db.insert(venuesTable).values({
      ...testVenue,
      created_by: user.id
    }).returning().execute();

    // Create multiple checkins with different timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Insert checkins in non-chronological order to test ordering
    await db.insert(checkinsTable).values([
      {
        user_id: user.id,
        venue_id: venue.id,
        message: 'First checkin',
        created_at: twoHoursAgo
      },
      {
        user_id: user.id,
        venue_id: venue.id,
        message: 'Latest checkin',
        created_at: now
      },
      {
        user_id: user.id,
        venue_id: venue.id,
        message: 'Middle checkin',
        created_at: oneHourAgo
      }
    ]).execute();

    const result = await getUserCheckins(user.id);

    expect(result).toHaveLength(3);
    expect(result[0].message).toBe('Latest checkin');
    expect(result[1].message).toBe('Middle checkin');
    expect(result[2].message).toBe('First checkin');

    // Verify ordering - each timestamp should be greater than or equal to the next
    expect(result[0].created_at.getTime()).toBeGreaterThanOrEqual(result[1].created_at.getTime());
    expect(result[1].created_at.getTime()).toBeGreaterThanOrEqual(result[2].created_at.getTime());
  });

  it('should return only checkins for the specified user', async () => {
    // Create two test users
    const [user1] = await db.insert(usersTable).values(testUser1).returning().execute();
    const [user2] = await db.insert(usersTable).values(testUser2).returning().execute();
    
    const [venue] = await db.insert(venuesTable).values({
      ...testVenue,
      created_by: user1.id
    }).returning().execute();

    // Create checkins for both users
    await db.insert(checkinsTable).values([
      {
        user_id: user1.id,
        venue_id: venue.id,
        message: 'User 1 checkin'
      },
      {
        user_id: user2.id,
        venue_id: venue.id,
        message: 'User 2 checkin'
      }
    ]).execute();

    const user1Checkins = await getUserCheckins(user1.id);
    const user2Checkins = await getUserCheckins(user2.id);

    expect(user1Checkins).toHaveLength(1);
    expect(user1Checkins[0].message).toBe('User 1 checkin');
    expect(user1Checkins[0].user_id).toBe(user1.id);

    expect(user2Checkins).toHaveLength(1);
    expect(user2Checkins[0].message).toBe('User 2 checkin');
    expect(user2Checkins[0].user_id).toBe(user2.id);
  });

  it('should support limit parameter for pagination', async () => {
    // Create test user and venue
    const [user] = await db.insert(usersTable).values(testUser1).returning().execute();
    const [venue] = await db.insert(venuesTable).values({
      ...testVenue,
      created_by: user.id
    }).returning().execute();

    // Create 5 checkins
    const checkins = Array.from({ length: 5 }, (_, i) => ({
      user_id: user.id,
      venue_id: venue.id,
      message: `Checkin ${i + 1}`
    }));

    await db.insert(checkinsTable).values(checkins).execute();

    // Test different limits
    const limitedResult = await getUserCheckins(user.id, 3);
    const unlimitedResult = await getUserCheckins(user.id);

    expect(limitedResult).toHaveLength(3);
    expect(unlimitedResult).toHaveLength(5);

    // Verify we get the most recent ones with limit
    expect(limitedResult.every(checkin => checkin.user_id === user.id)).toBe(true);
  });

  it('should return empty array for user with no checkins', async () => {
    // Create test user but no checkins
    const [user] = await db.insert(usersTable).values(testUser1).returning().execute();

    const result = await getUserCheckins(user.id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle checkins with null messages', async () => {
    // Create test user and venue
    const [user] = await db.insert(usersTable).values(testUser1).returning().execute();
    const [venue] = await db.insert(venuesTable).values({
      ...testVenue,
      created_by: user.id
    }).returning().execute();

    // Create checkin without message
    await db.insert(checkinsTable).values({
      user_id: user.id,
      venue_id: venue.id,
      message: null
    }).execute();

    const result = await getUserCheckins(user.id);

    expect(result).toHaveLength(1);
    expect(result[0].message).toBeNull();
    expect(result[0].user_id).toBe(user.id);
    expect(result[0].venue_id).toBe(venue.id);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should validate checkin structure and types', async () => {
    // Create test user and venue
    const [user] = await db.insert(usersTable).values(testUser1).returning().execute();
    const [venue] = await db.insert(venuesTable).values({
      ...testVenue,
      created_by: user.id
    }).returning().execute();

    await db.insert(checkinsTable).values({
      user_id: user.id,
      venue_id: venue.id,
      message: 'Test checkin'
    }).execute();

    const result = await getUserCheckins(user.id);

    expect(result).toHaveLength(1);
    const checkin = result[0];

    // Validate structure and types
    expect(typeof checkin.id).toBe('number');
    expect(typeof checkin.user_id).toBe('number');
    expect(typeof checkin.venue_id).toBe('number');
    expect(typeof checkin.message).toBe('string');
    expect(checkin.created_at).toBeInstanceOf(Date);

    expect(checkin.user_id).toBe(user.id);
    expect(checkin.venue_id).toBe(venue.id);
    expect(checkin.message).toBe('Test checkin');
  });

  it('should return empty array for non-existent user', async () => {
    const result = await getUserCheckins(999999);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });
});