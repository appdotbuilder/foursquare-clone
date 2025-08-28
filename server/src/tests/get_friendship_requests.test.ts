import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, friendshipsTable } from '../db/schema';
import { getFriendshipRequests } from '../handlers/get_friendship_requests';
import { eq, and } from 'drizzle-orm';

describe('getFriendshipRequests', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return pending friendship requests for a user', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'addressee',
          email: 'addressee@example.com',
          full_name: 'Test Addressee'
        },
        {
          username: 'requester1',
          email: 'requester1@example.com',
          full_name: 'Test Requester 1'
        },
        {
          username: 'requester2',
          email: 'requester2@example.com',
          full_name: 'Test Requester 2'
        }
      ])
      .returning()
      .execute();

    const [addressee, requester1, requester2] = users;

    // Create friendship requests
    const friendships = await db.insert(friendshipsTable)
      .values([
        {
          requester_id: requester1.id,
          addressee_id: addressee.id,
          status: 'pending'
        },
        {
          requester_id: requester2.id,
          addressee_id: addressee.id,
          status: 'pending'
        }
      ])
      .returning()
      .execute();

    // Get friendship requests for the addressee
    const results = await getFriendshipRequests(addressee.id);

    expect(results).toHaveLength(2);
    
    // Verify the first friendship request
    const request1 = results.find(r => r.requester_id === requester1.id);
    expect(request1).toBeDefined();
    expect(request1!.addressee_id).toEqual(addressee.id);
    expect(request1!.status).toEqual('pending');
    expect(request1!.id).toBeDefined();
    expect(request1!.created_at).toBeInstanceOf(Date);
    expect(request1!.updated_at).toBeInstanceOf(Date);

    // Verify the second friendship request
    const request2 = results.find(r => r.requester_id === requester2.id);
    expect(request2).toBeDefined();
    expect(request2!.addressee_id).toEqual(addressee.id);
    expect(request2!.status).toEqual('pending');
  });

  it('should return empty array when user has no pending requests', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        username: 'loneuser',
        email: 'lone@example.com',
        full_name: 'Lone User'
      })
      .returning()
      .execute();

    // Get friendship requests for user with no requests
    const results = await getFriendshipRequests(user[0].id);

    expect(results).toHaveLength(0);
  });

  it('should not return accepted friendship requests', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'addressee',
          email: 'addressee@example.com',
          full_name: 'Test Addressee'
        },
        {
          username: 'requester',
          email: 'requester@example.com',
          full_name: 'Test Requester'
        }
      ])
      .returning()
      .execute();

    const [addressee, requester] = users;

    // Create accepted friendship
    await db.insert(friendshipsTable)
      .values({
        requester_id: requester.id,
        addressee_id: addressee.id,
        status: 'accepted'
      })
      .execute();

    // Get friendship requests - should not include accepted ones
    const results = await getFriendshipRequests(addressee.id);

    expect(results).toHaveLength(0);
  });

  it('should not return rejected or blocked friendship requests', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'addressee',
          email: 'addressee@example.com',
          full_name: 'Test Addressee'
        },
        {
          username: 'requester1',
          email: 'requester1@example.com',
          full_name: 'Test Requester 1'
        },
        {
          username: 'requester2',
          email: 'requester2@example.com',
          full_name: 'Test Requester 2'
        }
      ])
      .returning()
      .execute();

    const [addressee, requester1, requester2] = users;

    // Create rejected and blocked friendships
    await db.insert(friendshipsTable)
      .values([
        {
          requester_id: requester1.id,
          addressee_id: addressee.id,
          status: 'rejected'
        },
        {
          requester_id: requester2.id,
          addressee_id: addressee.id,
          status: 'blocked'
        }
      ])
      .execute();

    // Get friendship requests - should not include rejected or blocked ones
    const results = await getFriendshipRequests(addressee.id);

    expect(results).toHaveLength(0);
  });

  it('should not return requests where user is the requester', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com',
          full_name: 'User 1'
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          full_name: 'User 2'
        }
      ])
      .returning()
      .execute();

    const [user1, user2] = users;

    // Create friendship request where user1 is the requester
    await db.insert(friendshipsTable)
      .values({
        requester_id: user1.id,
        addressee_id: user2.id,
        status: 'pending'
      })
      .execute();

    // Get friendship requests for user1 (the requester) - should be empty
    const results = await getFriendshipRequests(user1.id);

    expect(results).toHaveLength(0);
  });

  it('should handle mixed status friendship requests correctly', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'addressee',
          email: 'addressee@example.com',
          full_name: 'Test Addressee'
        },
        {
          username: 'requester1',
          email: 'requester1@example.com',
          full_name: 'Test Requester 1'
        },
        {
          username: 'requester2',
          email: 'requester2@example.com',
          full_name: 'Test Requester 2'
        },
        {
          username: 'requester3',
          email: 'requester3@example.com',
          full_name: 'Test Requester 3'
        }
      ])
      .returning()
      .execute();

    const [addressee, requester1, requester2, requester3] = users;

    // Create friendship requests with different statuses
    await db.insert(friendshipsTable)
      .values([
        {
          requester_id: requester1.id,
          addressee_id: addressee.id,
          status: 'pending'
        },
        {
          requester_id: requester2.id,
          addressee_id: addressee.id,
          status: 'accepted'
        },
        {
          requester_id: requester3.id,
          addressee_id: addressee.id,
          status: 'rejected'
        }
      ])
      .execute();

    // Get friendship requests - should only return pending ones
    const results = await getFriendshipRequests(addressee.id);

    expect(results).toHaveLength(1);
    expect(results[0].requester_id).toEqual(requester1.id);
    expect(results[0].status).toEqual('pending');
  });

  it('should order results by creation date', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'addressee',
          email: 'addressee@example.com',
          full_name: 'Test Addressee'
        },
        {
          username: 'requester1',
          email: 'requester1@example.com',
          full_name: 'Test Requester 1'
        },
        {
          username: 'requester2',
          email: 'requester2@example.com',
          full_name: 'Test Requester 2'
        }
      ])
      .returning()
      .execute();

    const [addressee, requester1, requester2] = users;

    // Create friendship requests at different times
    const firstRequest = await db.insert(friendshipsTable)
      .values({
        requester_id: requester1.id,
        addressee_id: addressee.id,
        status: 'pending'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));

    const secondRequest = await db.insert(friendshipsTable)
      .values({
        requester_id: requester2.id,
        addressee_id: addressee.id,
        status: 'pending'
      })
      .returning()
      .execute();

    // Get friendship requests
    const results = await getFriendshipRequests(addressee.id);

    expect(results).toHaveLength(2);
    
    // Verify both requests are returned
    const requestIds = results.map(r => r.id).sort();
    const expectedIds = [firstRequest[0].id, secondRequest[0].id].sort();
    expect(requestIds).toEqual(expectedIds);
  });
});