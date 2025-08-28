import { db } from '../db';
import { venuesTable, usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateVenueInput, type Venue } from '../schema';

export const createVenue = async (input: CreateVenueInput): Promise<Venue> => {
  try {
    // Validate that the creating user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.created_by} does not exist`);
    }

    // Insert venue record
    const result = await db.insert(venuesTable)
      .values({
        name: input.name,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
        category: input.category,
        description: input.description ?? null,
        phone: input.phone ?? null,
        website: input.website ?? null,
        created_by: input.created_by
      })
      .returning()
      .execute();

    const venue = result[0];
    return venue;
  } catch (error) {
    console.error('Venue creation failed:', error);
    throw error;
  }
};