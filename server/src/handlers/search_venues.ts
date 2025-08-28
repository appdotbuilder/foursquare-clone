import { db } from '../db';
import { venuesTable } from '../db/schema';
import { type SearchVenuesInput, type Venue } from '../schema';
import { and, ilike, eq, sql, type SQL } from 'drizzle-orm';

export const searchVenues = async (input: SearchVenuesInput): Promise<Venue[]> => {
  try {
    // Default radius to 10km if not provided
    const radius = input.radius || 10;
    
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Filter by radius using the Haversine formula
    conditions.push(
      sql`
        6371 * acos(
          cos(radians(${input.latitude})) 
          * cos(radians(${venuesTable.latitude})) 
          * cos(radians(${venuesTable.longitude}) - radians(${input.longitude})) 
          + sin(radians(${input.latitude})) 
          * sin(radians(${venuesTable.latitude}))
        ) <= ${radius}
      `
    );

    // Filter by category if provided
    if (input.category) {
      conditions.push(eq(venuesTable.category, input.category));
    }

    // Filter by text query if provided (search in name and description)
    if (input.query) {
      conditions.push(
        sql`(
          ${venuesTable.name} ILIKE ${'%' + input.query + '%'} OR 
          ${venuesTable.description} ILIKE ${'%' + input.query + '%'}
        )`
      );
    }

    // Build the complete query with all conditions and ordering
    const results = await db.select({
      id: venuesTable.id,
      name: venuesTable.name,
      address: venuesTable.address,
      latitude: venuesTable.latitude,
      longitude: venuesTable.longitude,
      category: venuesTable.category,
      description: venuesTable.description,
      phone: venuesTable.phone,
      website: venuesTable.website,
      created_by: venuesTable.created_by,
      created_at: venuesTable.created_at,
      updated_at: venuesTable.updated_at,
      distance: sql<number>`
        6371 * acos(
          cos(radians(${input.latitude})) 
          * cos(radians(${venuesTable.latitude})) 
          * cos(radians(${venuesTable.longitude}) - radians(${input.longitude})) 
          + sin(radians(${input.latitude})) 
          * sin(radians(${venuesTable.latitude}))
        )
      `.as('distance')
    })
    .from(venuesTable)
    .where(and(...conditions))
    .orderBy(sql`distance`)
    .execute();

    // Convert numeric fields and remove the distance field from results
    return results.map(venue => ({
      id: venue.id,
      name: venue.name,
      address: venue.address,
      latitude: venue.latitude, // real type doesn't need conversion
      longitude: venue.longitude, // real type doesn't need conversion
      category: venue.category,
      description: venue.description,
      phone: venue.phone,
      website: venue.website,
      created_by: venue.created_by,
      created_at: venue.created_at,
      updated_at: venue.updated_at
    }));
  } catch (error) {
    console.error('Venue search failed:', error);
    throw error;
  }
};