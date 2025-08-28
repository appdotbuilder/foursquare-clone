import { type User } from '../schema';

export async function getUserFriends(userId: number): Promise<User[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching all accepted friends for a user.
    // Should return users who have an accepted friendship with the given user ID,
    // regardless of who initiated the friendship.
    return Promise.resolve([]);
}