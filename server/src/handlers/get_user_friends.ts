import { db } from '../db';
import { friendshipsTable, usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq, or, and } from 'drizzle-orm';

export async function getUserFriends(userId: number): Promise<User[]> {
  try {
    // Query friendships where:
    // 1. The user is either requester or addressee
    // 2. The friendship status is 'accepted'
    // Join with users table to get friend details
    const results = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        full_name: usersTable.full_name,
        bio: usersTable.bio,
        profile_image_url: usersTable.profile_image_url,
        created_at: usersTable.created_at,
        updated_at: usersTable.updated_at,
        friendship_requester_id: friendshipsTable.requester_id,
        friendship_addressee_id: friendshipsTable.addressee_id
      })
      .from(friendshipsTable)
      .innerJoin(
        usersTable,
        or(
          // If user is requester, get addressee details
          and(
            eq(friendshipsTable.requester_id, userId),
            eq(usersTable.id, friendshipsTable.addressee_id)
          ),
          // If user is addressee, get requester details
          and(
            eq(friendshipsTable.addressee_id, userId),
            eq(usersTable.id, friendshipsTable.requester_id)
          )
        )
      )
      .where(eq(friendshipsTable.status, 'accepted'))
      .execute();

    // Map to User objects, excluding the friendship fields
    return results.map(result => ({
      id: result.id,
      username: result.username,
      email: result.email,
      full_name: result.full_name,
      bio: result.bio,
      profile_image_url: result.profile_image_url,
      created_at: result.created_at,
      updated_at: result.updated_at
    }));
  } catch (error) {
    console.error('Get user friends failed:', error);
    throw error;
  }
}