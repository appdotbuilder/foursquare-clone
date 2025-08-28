import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, friendshipsTable } from '../db/schema';
import { type UpdateFriendshipInput } from '../schema';
import { updateFriendship } from '../handlers/update_friendship';
import { eq } from 'drizzle-orm';

// Test users data
const testUser1 = {
  username: 'requester',
  email: 'requester@example.com',
  full_name: 'Request User'
};

const testUser2 = {
  username: 'addressee',
  email: 'addressee@example.com',
  full_name: 'Address User'
};

describe('updateFriendship', () => {
  let user1Id: number;
  let user2Id: number;
  let friendshipId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    user1Id = users[0].id;
    user2Id = users[1].id;

    // Create a pending friendship
    const friendship = await db.insert(friendshipsTable)
      .values({
        requester_id: user1Id,
        addressee_id: user2Id,
        status: 'pending'
      })
      .returning()
      .execute();

    friendshipId = friendship[0].id;
  });

  afterEach(resetDB);

  it('should accept a pending friendship', async () => {
    const input: UpdateFriendshipInput = {
      id: friendshipId,
      status: 'accepted'
    };

    const result = await updateFriendship(input);

    expect(result.id).toEqual(friendshipId);
    expect(result.requester_id).toEqual(user1Id);
    expect(result.addressee_id).toEqual(user2Id);
    expect(result.status).toEqual('accepted');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > result.created_at).toBe(true);
  });

  it('should reject a pending friendship', async () => {
    const input: UpdateFriendshipInput = {
      id: friendshipId,
      status: 'rejected'
    };

    const result = await updateFriendship(input);

    expect(result.status).toEqual('rejected');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should block a friendship', async () => {
    const input: UpdateFriendshipInput = {
      id: friendshipId,
      status: 'blocked'
    };

    const result = await updateFriendship(input);

    expect(result.status).toEqual('blocked');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update the friendship in database', async () => {
    const input: UpdateFriendshipInput = {
      id: friendshipId,
      status: 'accepted'
    };

    await updateFriendship(input);

    // Verify the update was persisted
    const friendships = await db.select()
      .from(friendshipsTable)
      .where(eq(friendshipsTable.id, friendshipId))
      .execute();

    expect(friendships).toHaveLength(1);
    expect(friendships[0].status).toEqual('accepted');
    expect(friendships[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent friendship', async () => {
    const input: UpdateFriendshipInput = {
      id: 99999, // Non-existent ID
      status: 'accepted'
    };

    await expect(updateFriendship(input)).rejects.toThrow(/friendship not found/i);
  });

  it('should throw error when trying to update blocked friendship', async () => {
    // First block the friendship
    await db.update(friendshipsTable)
      .set({ status: 'blocked' })
      .where(eq(friendshipsTable.id, friendshipId))
      .execute();

    const input: UpdateFriendshipInput = {
      id: friendshipId,
      status: 'accepted'
    };

    await expect(updateFriendship(input)).rejects.toThrow(/cannot update blocked friendship/i);
  });

  it('should allow updating from accepted to blocked', async () => {
    // First accept the friendship
    await db.update(friendshipsTable)
      .set({ status: 'accepted' })
      .where(eq(friendshipsTable.id, friendshipId))
      .execute();

    const input: UpdateFriendshipInput = {
      id: friendshipId,
      status: 'blocked'
    };

    const result = await updateFriendship(input);

    expect(result.status).toEqual('blocked');
  });

  it('should allow updating from rejected to accepted', async () => {
    // First reject the friendship
    await db.update(friendshipsTable)
      .set({ status: 'rejected' })
      .where(eq(friendshipsTable.id, friendshipId))
      .execute();

    const input: UpdateFriendshipInput = {
      id: friendshipId,
      status: 'accepted'
    };

    const result = await updateFriendship(input);

    expect(result.status).toEqual('accepted');
  });

  it('should update timestamp when status changes', async () => {
    // Get original timestamp
    const originalFriendship = await db.select()
      .from(friendshipsTable)
      .where(eq(friendshipsTable.id, friendshipId))
      .execute();

    const originalUpdatedAt = originalFriendship[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateFriendshipInput = {
      id: friendshipId,
      status: 'accepted'
    };

    const result = await updateFriendship(input);

    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });
});