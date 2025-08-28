import { db } from '../db';
import { checkinsTable, friendshipsTable, usersTable, venuesTable } from '../db/schema';
import { type ActivityFeedItem } from '../schema';
import { eq, desc, and, or } from 'drizzle-orm';

export const getActivityFeed = async (userId: number, limit: number = 20): Promise<ActivityFeedItem[]> => {
  try {
    // Query to get check-ins from the user's accepted friends, including user and venue data
    // We need check-ins from users who are friends with the given userId
    const results = await db.select({
      id: checkinsTable.id,
      user_id: checkinsTable.user_id,
      username: usersTable.username,
      full_name: usersTable.full_name,
      venue_id: checkinsTable.venue_id,
      venue_name: venuesTable.name,
      venue_address: venuesTable.address,
      message: checkinsTable.message,
      created_at: checkinsTable.created_at,
    })
      .from(checkinsTable)
      .innerJoin(usersTable, eq(checkinsTable.user_id, usersTable.id))
      .innerJoin(venuesTable, eq(checkinsTable.venue_id, venuesTable.id))
      .innerJoin(friendshipsTable, or(
        // Check if the check-in user is a friend (as requester or addressee)
        and(
          eq(friendshipsTable.requester_id, checkinsTable.user_id),
          eq(friendshipsTable.addressee_id, userId)
        ),
        and(
          eq(friendshipsTable.requester_id, userId),
          eq(friendshipsTable.addressee_id, checkinsTable.user_id)
        )
      ))
      .where(eq(friendshipsTable.status, 'accepted'))
      .orderBy(desc(checkinsTable.created_at))
      .limit(limit)
      .execute();

    return results.map(result => ({
      id: result.id,
      user_id: result.user_id,
      username: result.username,
      full_name: result.full_name,
      venue_id: result.venue_id,
      venue_name: result.venue_name,
      venue_address: result.venue_address,
      message: result.message,
      created_at: result.created_at
    }));
  } catch (error) {
    console.error('Failed to get activity feed:', error);
    throw error;
  }
};