import { db } from '../db';
import { friendshipsTable } from '../db/schema';
import { type UpdateFriendshipInput, type Friendship } from '../schema';
import { eq } from 'drizzle-orm';

export const updateFriendship = async (input: UpdateFriendshipInput): Promise<Friendship> => {
  try {
    // First, check if the friendship exists
    const existingFriendships = await db.select()
      .from(friendshipsTable)
      .where(eq(friendshipsTable.id, input.id))
      .execute();

    if (existingFriendships.length === 0) {
      throw new Error('Friendship not found');
    }

    const existingFriendship = existingFriendships[0];

    // Validate that the friendship is in a state that can be updated
    if (existingFriendship.status === 'blocked') {
      throw new Error('Cannot update blocked friendship');
    }

    // Update the friendship status and timestamp
    const result = await db.update(friendshipsTable)
      .set({
        status: input.status,
        updated_at: new Date()
      })
      .where(eq(friendshipsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Friendship update failed:', error);
    throw error;
  }
};