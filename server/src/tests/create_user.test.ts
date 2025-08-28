import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  bio: 'A test user bio',
  profile_image_url: 'https://example.com/avatar.jpg'
};

// Test input with only required fields
const minimalInput: CreateUserInput = {
  username: 'minimaluser',
  email: 'minimal@example.com',
  full_name: 'Minimal User'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    // Verify all fields
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.bio).toEqual('A test user bio');
    expect(result.profile_image_url).toEqual('https://example.com/avatar.jpg');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with only required fields', async () => {
    const result = await createUser(minimalInput);

    // Verify required fields
    expect(result.username).toEqual('minimaluser');
    expect(result.email).toEqual('minimal@example.com');
    expect(result.full_name).toEqual('Minimal User');
    expect(result.bio).toBeNull();
    expect(result.profile_image_url).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].bio).toEqual('A test user bio');
    expect(users[0].profile_image_url).toEqual('https://example.com/avatar.jpg');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null bio and profile_image_url correctly', async () => {
    const inputWithNulls: CreateUserInput = {
      username: 'nulluser',
      email: 'null@example.com',
      full_name: 'Null User',
      bio: null,
      profile_image_url: null
    };

    const result = await createUser(inputWithNulls);

    expect(result.bio).toBeNull();
    expect(result.profile_image_url).toBeNull();

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].bio).toBeNull();
    expect(users[0].profile_image_url).toBeNull();
  });

  it('should enforce unique username constraint', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create second user with same username
    const duplicateUsernameInput: CreateUserInput = {
      username: 'testuser', // Same username
      email: 'different@example.com', // Different email
      full_name: 'Different User'
    };

    await expect(createUser(duplicateUsernameInput)).rejects.toThrow();
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create second user with same email
    const duplicateEmailInput: CreateUserInput = {
      username: 'differentuser', // Different username
      email: 'test@example.com', // Same email
      full_name: 'Different User'
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow();
  });

  it('should create multiple users with different usernames and emails', async () => {
    const user1 = await createUser(testInput);
    const user2 = await createUser({
      username: 'user2',
      email: 'user2@example.com',
      full_name: 'User Two'
    });

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.username).toEqual('testuser');
    expect(user2.username).toEqual('user2');

    // Verify both users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });
});