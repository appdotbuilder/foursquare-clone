import { db } from '../db';
import { checkinsTable, venuesTable, usersTable } from '../db/schema';
import { type Checkin } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getUserCheckins(userId: number, limit?: number): Promise<Checkin[]> {
  try {
    // Build base query with join to get venue information
    let query = db.select({
      id: checkinsTable.id,
      user_id: checkinsTable.user_id,
      venue_id: checkinsTable.venue_id,
      message: checkinsTable.message,
      created_at: checkinsTable.created_at
    })
    .from(checkinsTable)
    .innerJoin(venuesTable, eq(checkinsTable.venue_id, venuesTable.id))
    .where(eq(checkinsTable.user_id, userId))
    .orderBy(desc(checkinsTable.created_at));

    // Apply limit if provided - need to build the final query properly
    const finalQuery = limit !== undefined 
      ? query.limit(limit)
      : query;

    const results = await finalQuery.execute();

    // Return the checkins - no numeric conversion needed for these fields
    return results;
  } catch (error) {
    console.error('Failed to fetch user checkins:', error);
    throw error;
  }
}