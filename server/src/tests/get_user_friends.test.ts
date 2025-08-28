import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, friendshipsTable } from '../db/schema';
import { getUserFriends } from '../handlers/get_user_friends';

describe('getUserFriends', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return friends when user is the requester', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@test.com',
          full_name: 'User One'
        },
        {
          username: 'user2',
          email: 'user2@test.com',
          full_name: 'User Two'
        }
      ])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    // Create accepted friendship where user1 is requester
    await db.insert(friendshipsTable)
      .values({
        requester_id: user1.id,
        addressee_id: user2.id,
        status: 'accepted'
      })
      .execute();

    // Get friends for user1
    const friends = await getUserFriends(user1.id);

    expect(friends).toHaveLength(1);
    expect(friends[0].id).toEqual(user2.id);
    expect(friends[0].username).toEqual('user2');
    expect(friends[0].email).toEqual('user2@test.com');
    expect(friends[0].full_name).toEqual('User Two');
  });

  it('should return friends when user is the addressee', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@test.com',
          full_name: 'User One'
        },
        {
          username: 'user2',
          email: 'user2@test.com',
          full_name: 'User Two'
        }
      ])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    // Create accepted friendship where user2 is requester
    await db.insert(friendshipsTable)
      .values({
        requester_id: user2.id,
        addressee_id: user1.id,
        status: 'accepted'
      })
      .execute();

    // Get friends for user1 (who is addressee)
    const friends = await getUserFriends(user1.id);

    expect(friends).toHaveLength(1);
    expect(friends[0].id).toEqual(user2.id);
    expect(friends[0].username).toEqual('user2');
    expect(friends[0].email).toEqual('user2@test.com');
    expect(friends[0].full_name).toEqual('User Two');
  });

  it('should return multiple friends from both directions', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@test.com',
          full_name: 'User One'
        },
        {
          username: 'user2',
          email: 'user2@test.com',
          full_name: 'User Two'
        },
        {
          username: 'user3',
          email: 'user3@test.com',
          full_name: 'User Three'
        }
      ])
      .returning()
      .execute();

    const [user1, user2, user3] = users;

    // Create multiple accepted friendships
    await db.insert(friendshipsTable)
      .values([
        {
          requester_id: user1.id,
          addressee_id: user2.id,
          status: 'accepted'
        },
        {
          requester_id: user3.id,
          addressee_id: user1.id,
          status: 'accepted'
        }
      ])
      .execute();

    // Get friends for user1
    const friends = await getUserFriends(user1.id);

    expect(friends).toHaveLength(2);
    
    // Check that both user2 and user3 are in the results
    const friendIds = friends.map(f => f.id).sort();
    expect(friendIds).toEqual([user2.id, user3.id].sort());
    
    const friendUsernames = friends.map(f => f.username).sort();
    expect(friendUsernames).toEqual(['user2', 'user3'].sort());
  });

  it('should exclude pending friendships', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@test.com',
          full_name: 'User One'
        },
        {
          username: 'user2',
          email: 'user2@test.com',
          full_name: 'User Two'
        }
      ])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    // Create pending friendship
    await db.insert(friendshipsTable)
      .values({
        requester_id: user1.id,
        addressee_id: user2.id,
        status: 'pending'
      })
      .execute();

    // Get friends for user1
    const friends = await getUserFriends(user1.id);

    expect(friends).toHaveLength(0);
  });

  it('should exclude rejected and blocked friendships', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@test.com',
          full_name: 'User One'
        },
        {
          username: 'user2',
          email: 'user2@test.com',
          full_name: 'User Two'
        },
        {
          username: 'user3',
          email: 'user3@test.com',
          full_name: 'User Three'
        }
      ])
      .returning()
      .execute();

    const [user1, user2, user3] = users;

    // Create rejected and blocked friendships
    await db.insert(friendshipsTable)
      .values([
        {
          requester_id: user1.id,
          addressee_id: user2.id,
          status: 'rejected'
        },
        {
          requester_id: user1.id,
          addressee_id: user3.id,
          status: 'blocked'
        }
      ])
      .execute();

    // Get friends for user1
    const friends = await getUserFriends(user1.id);

    expect(friends).toHaveLength(0);
  });

  it('should return empty array when user has no friends', async () => {
    // Create a user with no friendships
    const user = await db.insert(usersTable)
      .values({
        username: 'loneuser',
        email: 'lone@test.com',
        full_name: 'Lone User'
      })
      .returning()
      .execute();

    const friends = await getUserFriends(user[0].id);

    expect(friends).toHaveLength(0);
  });

  it('should return complete user objects with all fields', async () => {
    // Create test users with optional fields
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@test.com',
          full_name: 'User One',
          bio: 'Bio for user one',
          profile_image_url: 'https://example.com/user1.jpg'
        },
        {
          username: 'user2',
          email: 'user2@test.com',
          full_name: 'User Two',
          bio: null,
          profile_image_url: null
        }
      ])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    // Create accepted friendship
    await db.insert(friendshipsTable)
      .values({
        requester_id: user1.id,
        addressee_id: user2.id,
        status: 'accepted'
      })
      .execute();

    // Get friends for user1
    const friends = await getUserFriends(user1.id);

    expect(friends).toHaveLength(1);
    const friend = friends[0];
    
    // Check all required fields are present
    expect(friend.id).toEqual(user2.id);
    expect(friend.username).toEqual('user2');
    expect(friend.email).toEqual('user2@test.com');
    expect(friend.full_name).toEqual('User Two');
    expect(friend.bio).toBeNull();
    expect(friend.profile_image_url).toBeNull();
    expect(friend.created_at).toBeInstanceOf(Date);
    expect(friend.updated_at).toBeInstanceOf(Date);
  });
});