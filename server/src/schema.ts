import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  full_name: z.string(),
  bio: z.string().nullable(),
  profile_image_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for creating users
export const createUserInputSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  full_name: z.string().min(1),
  bio: z.string().nullable().optional(),
  profile_image_url: z.string().url().nullable().optional()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for updating users
export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).max(30).optional(),
  email: z.string().email().optional(),
  full_name: z.string().min(1).optional(),
  bio: z.string().nullable().optional(),
  profile_image_url: z.string().url().nullable().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Venue schema
export const venueSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  category: z.string(),
  description: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Venue = z.infer<typeof venueSchema>;

// Input schema for creating venues
export const createVenueInputSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  category: z.string().min(1),
  description: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  created_by: z.number()
});

export type CreateVenueInput = z.infer<typeof createVenueInputSchema>;

// Check-in schema
export const checkinSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  venue_id: z.number(),
  message: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Checkin = z.infer<typeof checkinSchema>;

// Input schema for creating check-ins
export const createCheckinInputSchema = z.object({
  user_id: z.number(),
  venue_id: z.number(),
  message: z.string().nullable().optional()
});

export type CreateCheckinInput = z.infer<typeof createCheckinInputSchema>;

// Friendship schema
export const friendshipSchema = z.object({
  id: z.number(),
  requester_id: z.number(),
  addressee_id: z.number(),
  status: z.enum(['pending', 'accepted', 'rejected', 'blocked']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Friendship = z.infer<typeof friendshipSchema>;

// Input schema for friendship requests
export const createFriendshipInputSchema = z.object({
  requester_id: z.number(),
  addressee_id: z.number()
});

export type CreateFriendshipInput = z.infer<typeof createFriendshipInputSchema>;

// Input schema for updating friendship status
export const updateFriendshipInputSchema = z.object({
  id: z.number(),
  status: z.enum(['accepted', 'rejected', 'blocked'])
});

export type UpdateFriendshipInput = z.infer<typeof updateFriendshipInputSchema>;

// Activity feed item schema
export const activityFeedItemSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  username: z.string(),
  full_name: z.string(),
  venue_id: z.number(),
  venue_name: z.string(),
  venue_address: z.string(),
  message: z.string().nullable(),
  created_at: z.coerce.date()
});

export type ActivityFeedItem = z.infer<typeof activityFeedItemSchema>;

// Location search input schema
export const searchVenuesInputSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().positive().max(50).optional(), // Radius in kilometers, max 50km
  category: z.string().optional(),
  query: z.string().optional()
});

export type SearchVenuesInput = z.infer<typeof searchVenuesInputSchema>;

// User profile with stats schema
export const userProfileSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  full_name: z.string(),
  bio: z.string().nullable(),
  profile_image_url: z.string().nullable(),
  checkin_count: z.number(),
  venue_count: z.number(),
  friend_count: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type UserProfile = z.infer<typeof userProfileSchema>;