import { db } from '../db';
import { friendshipsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function removeFriendship(friendshipId: number): Promise<boolean> {
  try {
    // Delete the friendship record
    const result = await db.delete(friendshipsTable)
      .where(eq(friendshipsTable.id, friendshipId))
      .returning()
      .execute();

    // Return true if a friendship was actually deleted, false if none existed
    return result.length > 0;
  } catch (error) {
    console.error('Friendship removal failed:', error);
    throw error;
  }
}