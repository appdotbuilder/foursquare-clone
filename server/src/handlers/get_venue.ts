import { db } from '../db';
import { venuesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Venue } from '../schema';

export const getVenue = async (venueId: number): Promise<Venue | null> => {
  try {
    const result = await db.select()
      .from(venuesTable)
      .where(eq(venuesTable.id, venueId))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const venue = result[0];
    return {
      ...venue,
      latitude: parseFloat(venue.latitude.toString()), // Convert real to number
      longitude: parseFloat(venue.longitude.toString()) // Convert real to number
    };
  } catch (error) {
    console.error('Venue retrieval failed:', error);
    throw error;
  }
};