import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
const createTestUser = async (): Promise<number> => {
  const testUser: CreateUserInput = {
    username: 'testuser',
    email: 'test@example.com',
    full_name: 'Test User',
    bio: 'Original bio',
    profile_image_url: 'https://example.com/original.jpg'
  };

  const result = await db.insert(usersTable)
    .values({
      username: testUser.username,
      email: testUser.email,
      full_name: testUser.full_name,
      bio: testUser.bio,
      profile_image_url: testUser.profile_image_url
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all user fields', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'updateduser',
      email: 'updated@example.com',
      full_name: 'Updated User',
      bio: 'Updated bio',
      profile_image_url: 'https://example.com/updated.jpg'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.username).toEqual('updateduser');
    expect(result.email).toEqual('updated@example.com');
    expect(result.full_name).toEqual('Updated User');
    expect(result.bio).toEqual('Updated bio');
    expect(result.profile_image_url).toEqual('https://example.com/updated.jpg');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update partial user fields', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'partialupdateuser',
      full_name: 'Partially Updated User'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.username).toEqual('partialupdateuser');
    expect(result.email).toEqual('test@example.com'); // Original value
    expect(result.full_name).toEqual('Partially Updated User');
    expect(result.bio).toEqual('Original bio'); // Original value
    expect(result.profile_image_url).toEqual('https://example.com/original.jpg'); // Original value
  });

  it('should update nullable fields to null', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      bio: null,
      profile_image_url: null
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.username).toEqual('testuser'); // Original value
    expect(result.bio).toBeNull();
    expect(result.profile_image_url).toBeNull();
  });

  it('should save updated user to database', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'dbupdateuser',
      email: 'dbupdate@example.com'
    };

    await updateUser(updateInput);

    // Verify the changes were persisted
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('dbupdateuser');
    expect(users[0].email).toEqual('dbupdate@example.com');
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update timestamp when user is updated', async () => {
    const userId = await createTestUser();

    // Get original timestamp
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'timestampuser'
    };

    const result = await updateUser(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUser[0].updated_at.getTime());
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999, // Non-existent ID
      username: 'nonexistentuser'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should throw error for duplicate username', async () => {
    // Create two users
    const userId1 = await createTestUser();
    
    await db.insert(usersTable)
      .values({
        username: 'duplicateuser',
        email: 'duplicate@example.com',
        full_name: 'Duplicate User'
      })
      .execute();

    const updateInput: UpdateUserInput = {
      id: userId1,
      username: 'duplicateuser' // This username already exists
    };

    await expect(updateUser(updateInput)).rejects.toThrow();
  });

  it('should throw error for duplicate email', async () => {
    // Create two users
    const userId1 = await createTestUser();
    
    await db.insert(usersTable)
      .values({
        username: 'anotheruser',
        email: 'duplicate@example.com',
        full_name: 'Another User'
      })
      .execute();

    const updateInput: UpdateUserInput = {
      id: userId1,
      email: 'duplicate@example.com' // This email already exists
    };

    await expect(updateUser(updateInput)).rejects.toThrow();
  });

  it('should handle only updating one field', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      bio: 'Only bio updated'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.username).toEqual('testuser'); // Original
    expect(result.email).toEqual('test@example.com'); // Original
    expect(result.full_name).toEqual('Test User'); // Original
    expect(result.bio).toEqual('Only bio updated'); // Updated
    expect(result.profile_image_url).toEqual('https://example.com/original.jpg'); // Original
  });
});