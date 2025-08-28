import { db } from '../db';
import { friendshipsTable, usersTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { type Friendship } from '../schema';

export async function getFriendshipRequests(userId: number): Promise<Friendship[]> {
  try {
    // Query friendships where the user is the addressee and status is 'pending'
    // Join with users table to get requester information
    const results = await db.select({
      id: friendshipsTable.id,
      requester_id: friendshipsTable.requester_id,
      addressee_id: friendshipsTable.addressee_id,
      status: friendshipsTable.status,
      created_at: friendshipsTable.created_at,
      updated_at: friendshipsTable.updated_at,
    })
      .from(friendshipsTable)
      .innerJoin(usersTable, eq(friendshipsTable.requester_id, usersTable.id))
      .where(
        and(
          eq(friendshipsTable.addressee_id, userId),
          eq(friendshipsTable.status, 'pending')
        )
      )
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch friendship requests:', error);
    throw error;
  }
}