import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, venuesTable, checkinsTable, friendshipsTable } from '../db/schema';
import { getUserProfile } from '../handlers/get_user_profile';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  bio: 'A test user bio',
  profile_image_url: 'https://example.com/avatar.jpg'
};

const testUser2 = {
  username: 'testuser2',
  email: 'test2@example.com',
  full_name: 'Test User 2',
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
  phone: '555-0123',
  website: 'https://example.com'
};

describe('getUserProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent user', async () => {
    const result = await getUserProfile(999);
    expect(result).toBeNull();
  });

  it('should return user profile with zero counts for new user', async () => {
    // Create a user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = users[0].id;

    const result = await getUserProfile(userId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(userId);
    expect(result!.username).toBe('testuser');
    expect(result!.email).toBe('test@example.com');
    expect(result!.full_name).toBe('Test User');
    expect(result!.bio).toBe('A test user bio');
    expect(result!.profile_image_url).toBe('https://example.com/avatar.jpg');
    expect(result!.checkin_count).toBe(0);
    expect(result!.venue_count).toBe(0);
    expect(result!.friend_count).toBe(0);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should handle nullable bio and profile_image_url', async () => {
    // Create a user with null bio and profile_image_url
    const users = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();

    const userId = users[0].id;

    const result = await getUserProfile(userId);

    expect(result).not.toBeNull();
    expect(result!.bio).toBeNull();
    expect(result!.profile_image_url).toBeNull();
  });

  it('should count checkins correctly', async () => {
    // Create users and venue
    const users = await db.insert(usersTable)
      .values([testUser, testUser2])
      .returning()
      .execute();

    const userId = users[0].id;
    const user2Id = users[1].id;

    const venues = await db.insert(venuesTable)
      .values({
        ...testVenue,
        created_by: user2Id
      })
      .returning()
      .execute();

    const venueId = venues[0].id;

    // Create checkins for the user
    await db.insert(checkinsTable)
      .values([
        { user_id: userId, venue_id: venueId, message: 'First checkin' },
        { user_id: userId, venue_id: venueId, message: 'Second checkin' },
        { user_id: user2Id, venue_id: venueId, message: 'Other user checkin' }
      ])
      .execute();

    const result = await getUserProfile(userId);

    expect(result).not.toBeNull();
    expect(result!.checkin_count).toBe(2);
    expect(result!.venue_count).toBe(0); // Venue was created by user2
  });

  it('should count venues correctly', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([testUser, testUser2])
      .returning()
      .execute();

    const userId = users[0].id;
    const user2Id = users[1].id;

    // Create venues - some by user, some by other user
    await db.insert(venuesTable)
      .values([
        { ...testVenue, name: 'User Venue 1', created_by: userId },
        { ...testVenue, name: 'User Venue 2', created_by: userId },
        { ...testVenue, name: 'Other User Venue', created_by: user2Id }
      ])
      .execute();

    const result = await getUserProfile(userId);

    expect(result).not.toBeNull();
    expect(result!.venue_count).toBe(2);
  });

  it('should count friends correctly', async () => {
    // Create three users
    const users = await db.insert(usersTable)
      .values([testUser, testUser2, {
        username: 'testuser3',
        email: 'test3@example.com',
        full_name: 'Test User 3'
      }])
      .returning()
      .execute();

    const userId = users[0].id;
    const user2Id = users[1].id;
    const user3Id = users[2].id;

    // Create friendships - user is requester in one, addressee in another
    await db.insert(friendshipsTable)
      .values([
        { requester_id: userId, addressee_id: user2Id, status: 'accepted' },
        { requester_id: user3Id, addressee_id: userId, status: 'accepted' },
        { requester_id: user2Id, addressee_id: user3Id, status: 'pending' } // Should not count
      ])
      .execute();

    const result = await getUserProfile(userId);

    expect(result).not.toBeNull();
    expect(result!.friend_count).toBe(2);
  });

  it('should return complete profile with all stats', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([testUser, testUser2])
      .returning()
      .execute();

    const userId = users[0].id;
    const user2Id = users[1].id;

    // Create venues by the user
    const venues = await db.insert(venuesTable)
      .values([
        { ...testVenue, name: 'User Venue 1', created_by: userId },
        { ...testVenue, name: 'User Venue 2', created_by: userId }
      ])
      .returning()
      .execute();

    // Create checkins by the user
    await db.insert(checkinsTable)
      .values([
        { user_id: userId, venue_id: venues[0].id, message: 'Checkin 1' },
        { user_id: userId, venue_id: venues[1].id, message: 'Checkin 2' },
        { user_id: userId, venue_id: venues[0].id, message: 'Checkin 3' }
      ])
      .execute();

    // Create friendship
    await db.insert(friendshipsTable)
      .values({ requester_id: userId, addressee_id: user2Id, status: 'accepted' })
      .execute();

    const result = await getUserProfile(userId);

    expect(result).not.toBeNull();
    expect(result!.username).toBe('testuser');
    expect(result!.email).toBe('test@example.com');
    expect(result!.checkin_count).toBe(3);
    expect(result!.venue_count).toBe(2);
    expect(result!.friend_count).toBe(1);
  });

  it('should not count pending or rejected friendships', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([testUser, testUser2, {
        username: 'testuser3',
        email: 'test3@example.com',
        full_name: 'Test User 3'
      }, {
        username: 'testuser4',
        email: 'test4@example.com',
        full_name: 'Test User 4'
      }])
      .returning()
      .execute();

    const userId = users[0].id;
    const user2Id = users[1].id;
    const user3Id = users[2].id;
    const user4Id = users[3].id;

    // Create friendships with different statuses
    await db.insert(friendshipsTable)
      .values([
        { requester_id: userId, addressee_id: user2Id, status: 'pending' },
        { requester_id: user3Id, addressee_id: userId, status: 'rejected' },
        { requester_id: userId, addressee_id: user3Id, status: 'blocked' },
        { requester_id: userId, addressee_id: user4Id, status: 'accepted' } // Only this should count
      ])
      .execute();

    const result = await getUserProfile(userId);

    expect(result).not.toBeNull();
    expect(result!.friend_count).toBe(1); // Only accepted friendship should be counted
  });
});