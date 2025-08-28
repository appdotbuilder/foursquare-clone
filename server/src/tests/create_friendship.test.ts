import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, friendshipsTable } from '../db/schema';
import { type CreateFriendshipInput } from '../schema';
import { createFriendship } from '../handlers/create_friendship';
import { eq, and, or } from 'drizzle-orm';

describe('createFriendship', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test users
  const createTestUsers = async () => {
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
    
    return users;
  };

  it('should create a friendship request between two users', async () => {
    const users = await createTestUsers();
    
    const testInput: CreateFriendshipInput = {
      requester_id: users[0].id,
      addressee_id: users[1].id
    };

    const result = await createFriendship(testInput);

    // Verify basic fields
    expect(result.requester_id).toEqual(users[0].id);
    expect(result.addressee_id).toEqual(users[1].id);
    expect(result.status).toEqual('pending');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save friendship to database', async () => {
    const users = await createTestUsers();
    
    const testInput: CreateFriendshipInput = {
      requester_id: users[0].id,
      addressee_id: users[1].id
    };

    const result = await createFriendship(testInput);

    // Verify it was saved to database
    const friendships = await db.select()
      .from(friendshipsTable)
      .where(eq(friendshipsTable.id, result.id))
      .execute();

    expect(friendships).toHaveLength(1);
    expect(friendships[0].requester_id).toEqual(users[0].id);
    expect(friendships[0].addressee_id).toEqual(users[1].id);
    expect(friendships[0].status).toEqual('pending');
    expect(friendships[0].created_at).toBeInstanceOf(Date);
    expect(friendships[0].updated_at).toBeInstanceOf(Date);
  });

  it('should prevent users from sending friend requests to themselves', async () => {
    const users = await createTestUsers();
    
    const testInput: CreateFriendshipInput = {
      requester_id: users[0].id,
      addressee_id: users[0].id // Same user
    };

    await expect(createFriendship(testInput)).rejects.toThrow(/cannot send friend request to yourself/i);
  });

  it('should reject request when requester does not exist', async () => {
    const users = await createTestUsers();
    
    const testInput: CreateFriendshipInput = {
      requester_id: 99999, // Non-existent user
      addressee_id: users[0].id
    };

    await expect(createFriendship(testInput)).rejects.toThrow(/one or both users do not exist/i);
  });

  it('should reject request when addressee does not exist', async () => {
    const users = await createTestUsers();
    
    const testInput: CreateFriendshipInput = {
      requester_id: users[0].id,
      addressee_id: 99999 // Non-existent user
    };

    await expect(createFriendship(testInput)).rejects.toThrow(/one or both users do not exist/i);
  });

  it('should reject request when both users do not exist', async () => {
    const testInput: CreateFriendshipInput = {
      requester_id: 99999,
      addressee_id: 88888
    };

    await expect(createFriendship(testInput)).rejects.toThrow(/one or both users do not exist/i);
  });

  it('should prevent duplicate friendship requests in same direction', async () => {
    const users = await createTestUsers();
    
    const testInput: CreateFriendshipInput = {
      requester_id: users[0].id,
      addressee_id: users[1].id
    };

    // Create first friendship request
    await createFriendship(testInput);

    // Try to create duplicate request
    await expect(createFriendship(testInput)).rejects.toThrow(/friendship already exists between these users/i);
  });

  it('should prevent duplicate friendship requests in reverse direction', async () => {
    const users = await createTestUsers();
    
    // Create first friendship request
    const firstRequest: CreateFriendshipInput = {
      requester_id: users[0].id,
      addressee_id: users[1].id
    };
    await createFriendship(firstRequest);

    // Try to create reverse request
    const reverseRequest: CreateFriendshipInput = {
      requester_id: users[1].id,
      addressee_id: users[0].id
    };

    await expect(createFriendship(reverseRequest)).rejects.toThrow(/friendship already exists between these users/i);
  });

  it('should allow multiple friendship requests from same user to different users', async () => {
    const users = await createTestUsers();
    
    // User 0 sends request to User 1
    const firstRequest: CreateFriendshipInput = {
      requester_id: users[0].id,
      addressee_id: users[1].id
    };
    const result1 = await createFriendship(firstRequest);

    // User 0 sends request to User 2
    const secondRequest: CreateFriendshipInput = {
      requester_id: users[0].id,
      addressee_id: users[2].id
    };
    const result2 = await createFriendship(secondRequest);

    // Verify both friendships were created
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.addressee_id).toEqual(users[1].id);
    expect(result2.addressee_id).toEqual(users[2].id);
    
    // Verify both are in database
    const friendships = await db.select()
      .from(friendshipsTable)
      .where(eq(friendshipsTable.requester_id, users[0].id))
      .execute();

    expect(friendships).toHaveLength(2);
  });

  it('should handle existing friendship with different status', async () => {
    const users = await createTestUsers();
    
    // Create an existing friendship with 'rejected' status
    await db.insert(friendshipsTable)
      .values({
        requester_id: users[0].id,
        addressee_id: users[1].id,
        status: 'rejected'
      })
      .execute();

    const testInput: CreateFriendshipInput = {
      requester_id: users[1].id,
      addressee_id: users[0].id
    };

    // Should still prevent creation even if status is different
    await expect(createFriendship(testInput)).rejects.toThrow(/friendship already exists between these users/i);
  });
});