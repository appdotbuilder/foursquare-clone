import { db } from '../db';
import { usersTable, checkinsTable, venuesTable, friendshipsTable } from '../db/schema';
import { type UserProfile } from '../schema';
import { eq, count, or, and } from 'drizzle-orm';

export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  try {
    // First, get the user's basic info
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Get checkin count
    const checkinCountResult = await db.select({ count: count() })
      .from(checkinsTable)
      .where(eq(checkinsTable.user_id, userId))
      .execute();

    const checkinCount = checkinCountResult[0]?.count || 0;

    // Get venue count (venues created by this user)
    const venueCountResult = await db.select({ count: count() })
      .from(venuesTable)
      .where(eq(venuesTable.created_by, userId))
      .execute();

    const venueCount = venueCountResult[0]?.count || 0;

    // Get friend count (accepted friendships where user is either requester or addressee)
    const friendCountResult = await db.select({ count: count() })
      .from(friendshipsTable)
      .where(
        and(
          eq(friendshipsTable.status, 'accepted'),
          or(
            eq(friendshipsTable.requester_id, userId),
            eq(friendshipsTable.addressee_id, userId)
          )
        )
      )
      .execute();

    const friendCount = friendCountResult[0]?.count || 0;

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      bio: user.bio,
      profile_image_url: user.profile_image_url,
      checkin_count: checkinCount,
      venue_count: venueCount,
      friend_count: friendCount,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('User profile fetch failed:', error);
    throw error;
  }
}