import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // First, check if the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    // Build the update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date()
    };

    if (input.username !== undefined) {
      updateData['username'] = input.username;
    }
    
    if (input.email !== undefined) {
      updateData['email'] = input.email;
    }
    
    if (input.full_name !== undefined) {
      updateData['full_name'] = input.full_name;
    }
    
    if (input.bio !== undefined) {
      updateData['bio'] = input.bio;
    }
    
    if (input.profile_image_url !== undefined) {
      updateData['profile_image_url'] = input.profile_image_url;
    }

    // Update the user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};