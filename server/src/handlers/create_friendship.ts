import { db } from '../db';
import { friendshipsTable, usersTable } from '../db/schema';
import { type CreateFriendshipInput, type Friendship } from '../schema';
import { eq, and, or } from 'drizzle-orm';

export async function createFriendship(input: CreateFriendshipInput): Promise<Friendship> {
  try {
    // Prevent users from sending requests to themselves
    if (input.requester_id === input.addressee_id) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Verify both users exist
    const users = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(or(
        eq(usersTable.id, input.requester_id),
        eq(usersTable.id, input.addressee_id)
      ))
      .execute();

    if (users.length !== 2) {
      throw new Error('One or both users do not exist');
    }

    // Check if friendship already exists in either direction
    const existingFriendship = await db.select()
      .from(friendshipsTable)
      .where(
        or(
          and(
            eq(friendshipsTable.requester_id, input.requester_id),
            eq(friendshipsTable.addressee_id, input.addressee_id)
          ),
          and(
            eq(friendshipsTable.requester_id, input.addressee_id),
            eq(friendshipsTable.addressee_id, input.requester_id)
          )
        )
      )
      .execute();

    if (existingFriendship.length > 0) {
      throw new Error('Friendship already exists between these users');
    }

    // Create the friendship request
    const result = await db.insert(friendshipsTable)
      .values({
        requester_id: input.requester_id,
        addressee_id: input.addressee_id,
        status: 'pending'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Friendship creation failed:', error);
    throw error;
  }
}