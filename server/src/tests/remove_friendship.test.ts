import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, friendshipsTable } from '../db/schema';
import { removeFriendship } from '../handlers/remove_friendship';
import { eq } from 'drizzle-orm';

describe('removeFriendship', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should remove an existing friendship', async () => {
    // Create test users first
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com',
          full_name: 'User One'
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          full_name: 'User Two'
        }
      ])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    // Create a friendship
    const friendship = await db.insert(friendshipsTable)
      .values({
        requester_id: user1.id,
        addressee_id: user2.id,
        status: 'accepted'
      })
      .returning()
      .execute();

    const friendshipId = friendship[0].id;

    // Remove the friendship
    const result = await removeFriendship(friendshipId);

    // Should return true indicating successful removal
    expect(result).toBe(true);

    // Verify friendship is deleted from database
    const remainingFriendships = await db.select()
      .from(friendshipsTable)
      .where(eq(friendshipsTable.id, friendshipId))
      .execute();

    expect(remainingFriendships).toHaveLength(0);
  });

  it('should return false for non-existent friendship', async () => {
    const nonExistentId = 999;

    // Try to remove non-existent friendship
    const result = await removeFriendship(nonExistentId);

    // Should return false since no friendship existed
    expect(result).toBe(false);

    // Database should remain unchanged (empty)
    const allFriendships = await db.select()
      .from(friendshipsTable)
      .execute();

    expect(allFriendships).toHaveLength(0);
  });

  it('should remove friendship regardless of status', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com',
          full_name: 'User One'
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          full_name: 'User Two'
        }
      ])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    // Create friendships with different statuses
    const friendships = await db.insert(friendshipsTable)
      .values([
        {
          requester_id: user1.id,
          addressee_id: user2.id,
          status: 'pending'
        },
        {
          requester_id: user2.id,
          addressee_id: user1.id,
          status: 'rejected'
        }
      ])
      .returning()
      .execute();

    // Remove pending friendship
    const result1 = await removeFriendship(friendships[0].id);
    expect(result1).toBe(true);

    // Remove rejected friendship
    const result2 = await removeFriendship(friendships[1].id);
    expect(result2).toBe(true);

    // Verify both are deleted
    const remainingFriendships = await db.select()
      .from(friendshipsTable)
      .execute();

    expect(remainingFriendships).toHaveLength(0);
  });

  it('should handle multiple friendship removals', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com',
          full_name: 'User One'
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          full_name: 'User Two'
        },
        {
          username: 'user3',
          email: 'user3@example.com',
          full_name: 'User Three'
        }
      ])
      .returning()
      .execute();

    // Create multiple friendships
    const friendships = await db.insert(friendshipsTable)
      .values([
        {
          requester_id: users[0].id,
          addressee_id: users[1].id,
          status: 'accepted'
        },
        {
          requester_id: users[0].id,
          addressee_id: users[2].id,
          status: 'accepted'
        }
      ])
      .returning()
      .execute();

    // Remove first friendship
    const result1 = await removeFriendship(friendships[0].id);
    expect(result1).toBe(true);

    // Verify only one friendship remains
    const remainingFriendships = await db.select()
      .from(friendshipsTable)
      .execute();

    expect(remainingFriendships).toHaveLength(1);
    expect(remainingFriendships[0].id).toBe(friendships[1].id);

    // Remove second friendship
    const result2 = await removeFriendship(friendships[1].id);
    expect(result2).toBe(true);

    // Verify no friendships remain
    const finalFriendships = await db.select()
      .from(friendshipsTable)
      .execute();

    expect(finalFriendships).toHaveLength(0);
  });
});