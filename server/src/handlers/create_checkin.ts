import { db } from '../db';
import { checkinsTable, usersTable, venuesTable } from '../db/schema';
import { type CreateCheckinInput, type Checkin } from '../schema';
import { eq } from 'drizzle-orm';

export const createCheckin = async (input: CreateCheckinInput): Promise<Checkin> => {
  try {
    // Validate that user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Validate that venue exists
    const venue = await db.select()
      .from(venuesTable)
      .where(eq(venuesTable.id, input.venue_id))
      .execute();

    if (venue.length === 0) {
      throw new Error(`Venue with id ${input.venue_id} does not exist`);
    }

    // Insert check-in record
    const result = await db.insert(checkinsTable)
      .values({
        user_id: input.user_id,
        venue_id: input.venue_id,
        message: input.message || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Check-in creation failed:', error);
    throw error;
  }
};