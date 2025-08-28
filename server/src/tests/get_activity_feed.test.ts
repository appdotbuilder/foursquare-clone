import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, venuesTable, checkinsTable, friendshipsTable } from '../db/schema';
import { getActivityFeed } from '../handlers/get_activity_feed';

describe('getActivityFeed', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no friends', async () => {
    // Create a user with no friends
    const [user] = await db.insert(usersTable)
      .values({
        username: 'loneuser',
        email: 'lone@example.com',
        full_name: 'Lone User'
      })
      .returning()
      .execute();

    const result = await getActivityFeed(user.id);

    expect(result).toEqual([]);
  });

  it('should return check-ins from accepted friends only', async () => {
    // Create users
    const [user1, user2, user3] = await db.insert(usersTable)
      .values([
        { username: 'user1', email: 'user1@example.com', full_name: 'User One' },
        { username: 'user2', email: 'user2@example.com', full_name: 'User Two' },
        { username: 'user3', email: 'user3@example.com', full_name: 'User Three' }
      ])
      .returning()
      .execute();

    // Create venue
    const [venue] = await db.insert(venuesTable)
      .values({
        name: 'Test Venue',
        address: '123 Test St',
        latitude: 40.7128,
        longitude: -74.0060,
        category: 'restaurant',
        created_by: user1.id
      })
      .returning()
      .execute();

    // Create accepted friendship between user1 and user2
    await db.insert(friendshipsTable)
      .values({
        requester_id: user1.id,
        addressee_id: user2.id,
        status: 'accepted'
      })
      .execute();

    // Create pending friendship between user1 and user3
    await db.insert(friendshipsTable)
      .values({
        requester_id: user1.id,
        addressee_id: user3.id,
        status: 'pending'
      })
      .execute();

    // Create check-ins from both users
    await db.insert(checkinsTable)
      .values([
        {
          user_id: user2.id,
          venue_id: venue.id,
          message: 'Great food!'
        },
        {
          user_id: user3.id,
          venue_id: venue.id,
          message: 'Should not appear'
        }
      ])
      .execute();

    // Get activity feed for user1
    const result = await getActivityFeed(user1.id);

    // Should only include check-in from user2 (accepted friend)
    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(user2.id);
    expect(result[0].username).toBe('user2');
    expect(result[0].full_name).toBe('User Two');
    expect(result[0].venue_name).toBe('Test Venue');
    expect(result[0].venue_address).toBe('123 Test St');
    expect(result[0].message).toBe('Great food!');
  });

  it('should work with bidirectional friendships', async () => {
    // Create users
    const [user1, user2] = await db.insert(usersTable)
      .values([
        { username: 'alice', email: 'alice@example.com', full_name: 'Alice Smith' },
        { username: 'bob', email: 'bob@example.com', full_name: 'Bob Jones' }
      ])
      .returning()
      .execute();

    // Create venue
    const [venue] = await db.insert(venuesTable)
      .values({
        name: 'Coffee Shop',
        address: '456 Main St',
        latitude: 40.7589,
        longitude: -73.9851,
        category: 'cafe',
        created_by: user1.id
      })
      .returning()
      .execute();

    // Create friendship where user2 is the requester and user1 is addressee
    await db.insert(friendshipsTable)
      .values({
        requester_id: user2.id,
        addressee_id: user1.id,
        status: 'accepted'
      })
      .execute();

    // Create check-in from user2
    await db.insert(checkinsTable)
      .values({
        user_id: user2.id,
        venue_id: venue.id,
        message: 'Love this coffee!'
      })
      .execute();

    // Get activity feed for user1 (should see user2's check-in)
    const result = await getActivityFeed(user1.id);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(user2.id);
    expect(result[0].username).toBe('bob');
    expect(result[0].full_name).toBe('Bob Jones');
    expect(result[0].venue_name).toBe('Coffee Shop');
    expect(result[0].message).toBe('Love this coffee!');
  });

  it('should return check-ins ordered by created_at DESC', async () => {
    // Create users
    const [user1, user2] = await db.insert(usersTable)
      .values([
        { username: 'user1', email: 'user1@example.com', full_name: 'User One' },
        { username: 'user2', email: 'user2@example.com', full_name: 'User Two' }
      ])
      .returning()
      .execute();

    // Create venues
    const [venue1, venue2] = await db.insert(venuesTable)
      .values([
        {
          name: 'Venue A',
          address: '123 A St',
          latitude: 40.7128,
          longitude: -74.0060,
          category: 'restaurant',
          created_by: user1.id
        },
        {
          name: 'Venue B',
          address: '456 B St',
          latitude: 40.7589,
          longitude: -73.9851,
          category: 'bar',
          created_by: user1.id
        }
      ])
      .returning()
      .execute();

    // Create friendship
    await db.insert(friendshipsTable)
      .values({
        requester_id: user1.id,
        addressee_id: user2.id,
        status: 'accepted'
      })
      .execute();

    // Create check-ins with different timestamps (older first)
    const olderTime = new Date('2024-01-01T10:00:00Z');
    const newerTime = new Date('2024-01-01T15:00:00Z');

    await db.insert(checkinsTable)
      .values([
        {
          user_id: user2.id,
          venue_id: venue1.id,
          message: 'First check-in',
          created_at: olderTime
        },
        {
          user_id: user2.id,
          venue_id: venue2.id,
          message: 'Second check-in',
          created_at: newerTime
        }
      ])
      .execute();

    const result = await getActivityFeed(user1.id);

    expect(result).toHaveLength(2);
    // Should be ordered by created_at DESC (newest first)
    expect(result[0].message).toBe('Second check-in');
    expect(result[0].venue_name).toBe('Venue B');
    expect(result[1].message).toBe('First check-in');
    expect(result[1].venue_name).toBe('Venue A');
  });

  it('should respect the limit parameter', async () => {
    // Create users
    const [user1, user2] = await db.insert(usersTable)
      .values([
        { username: 'user1', email: 'user1@example.com', full_name: 'User One' },
        { username: 'user2', email: 'user2@example.com', full_name: 'User Two' }
      ])
      .returning()
      .execute();

    // Create venue
    const [venue] = await db.insert(venuesTable)
      .values({
        name: 'Popular Venue',
        address: '789 Popular St',
        latitude: 40.7505,
        longitude: -73.9934,
        category: 'restaurant',
        created_by: user1.id
      })
      .returning()
      .execute();

    // Create friendship
    await db.insert(friendshipsTable)
      .values({
        requester_id: user1.id,
        addressee_id: user2.id,
        status: 'accepted'
      })
      .execute();

    // Create 5 check-ins
    const checkinValues = Array.from({ length: 5 }, (_, i) => ({
      user_id: user2.id,
      venue_id: venue.id,
      message: `Check-in ${i + 1}`
    }));

    await db.insert(checkinsTable)
      .values(checkinValues)
      .execute();

    // Test with limit of 3
    const result = await getActivityFeed(user1.id, 3);

    expect(result).toHaveLength(3);
    expect(result.every(item => item.user_id === user2.id)).toBe(true);
  });

  it('should use default limit when not provided', async () => {
    // Create users
    const [user1, user2] = await db.insert(usersTable)
      .values([
        { username: 'user1', email: 'user1@example.com', full_name: 'User One' },
        { username: 'user2', email: 'user2@example.com', full_name: 'User Two' }
      ])
      .returning()
      .execute();

    // Create venue
    const [venue] = await db.insert(venuesTable)
      .values({
        name: 'Test Venue',
        address: '123 Test St',
        latitude: 40.7128,
        longitude: -74.0060,
        category: 'restaurant',
        created_by: user1.id
      })
      .returning()
      .execute();

    // Create friendship
    await db.insert(friendshipsTable)
      .values({
        requester_id: user1.id,
        addressee_id: user2.id,
        status: 'accepted'
      })
      .execute();

    // Create check-in
    await db.insert(checkinsTable)
      .values({
        user_id: user2.id,
        venue_id: venue.id,
        message: 'Test message'
      })
      .execute();

    // Call without limit parameter
    const result = await getActivityFeed(user1.id);

    expect(result).toHaveLength(1);
    expect(result[0].message).toBe('Test message');
  });

  it('should handle check-ins with null messages', async () => {
    // Create users
    const [user1, user2] = await db.insert(usersTable)
      .values([
        { username: 'user1', email: 'user1@example.com', full_name: 'User One' },
        { username: 'user2', email: 'user2@example.com', full_name: 'User Two' }
      ])
      .returning()
      .execute();

    // Create venue
    const [venue] = await db.insert(venuesTable)
      .values({
        name: 'Quiet Venue',
        address: '321 Quiet St',
        latitude: 40.7128,
        longitude: -74.0060,
        category: 'library',
        created_by: user1.id
      })
      .returning()
      .execute();

    // Create friendship
    await db.insert(friendshipsTable)
      .values({
        requester_id: user1.id,
        addressee_id: user2.id,
        status: 'accepted'
      })
      .execute();

    // Create check-in with null message
    await db.insert(checkinsTable)
      .values({
        user_id: user2.id,
        venue_id: venue.id,
        message: null
      })
      .execute();

    const result = await getActivityFeed(user1.id);

    expect(result).toHaveLength(1);
    expect(result[0].message).toBeNull();
    expect(result[0].venue_name).toBe('Quiet Venue');
  });

  it('should include all required fields in response', async () => {
    // Create users
    const [user1, user2] = await db.insert(usersTable)
      .values([
        { username: 'user1', email: 'user1@example.com', full_name: 'User One' },
        { username: 'user2', email: 'user2@example.com', full_name: 'User Two' }
      ])
      .returning()
      .execute();

    // Create venue
    const [venue] = await db.insert(venuesTable)
      .values({
        name: 'Complete Venue',
        address: '999 Complete Ave',
        latitude: 40.7589,
        longitude: -73.9851,
        category: 'entertainment',
        created_by: user1.id
      })
      .returning()
      .execute();

    // Create friendship
    await db.insert(friendshipsTable)
      .values({
        requester_id: user1.id,
        addressee_id: user2.id,
        status: 'accepted'
      })
      .execute();

    // Create check-in
    await db.insert(checkinsTable)
      .values({
        user_id: user2.id,
        venue_id: venue.id,
        message: 'Complete check-in'
      })
      .execute();

    const result = await getActivityFeed(user1.id);

    expect(result).toHaveLength(1);
    const item = result[0];

    // Verify all required fields are present
    expect(typeof item.id).toBe('number');
    expect(typeof item.user_id).toBe('number');
    expect(typeof item.username).toBe('string');
    expect(typeof item.full_name).toBe('string');
    expect(typeof item.venue_id).toBe('number');
    expect(typeof item.venue_name).toBe('string');
    expect(typeof item.venue_address).toBe('string');
    expect(item.created_at).toBeInstanceOf(Date);

    // Verify specific values
    expect(item.user_id).toBe(user2.id);
    expect(item.username).toBe('user2');
    expect(item.full_name).toBe('User Two');
    expect(item.venue_id).toBe(venue.id);
    expect(item.venue_name).toBe('Complete Venue');
    expect(item.venue_address).toBe('999 Complete Ave');
    expect(item.message).toBe('Complete check-in');
  });
});