import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  integer,
  real,
  pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for friendship status
export const friendshipStatusEnum = pgEnum('friendship_status', [
  'pending',
  'accepted', 
  'rejected',
  'blocked'
]);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  full_name: text('full_name').notNull(),
  bio: text('bio'), // Nullable by default
  profile_image_url: text('profile_image_url'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Venues table
export const venuesTable = pgTable('venues', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  latitude: real('latitude').notNull(), // Use real for coordinates
  longitude: real('longitude').notNull(), // Use real for coordinates
  category: text('category').notNull(),
  description: text('description'), // Nullable by default
  phone: text('phone'), // Nullable by default
  website: text('website'), // Nullable by default
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Check-ins table
export const checkinsTable = pgTable('checkins', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  venue_id: integer('venue_id').notNull().references(() => venuesTable.id),
  message: text('message'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Friendships table
export const friendshipsTable = pgTable('friendships', {
  id: serial('id').primaryKey(),
  requester_id: integer('requester_id').notNull().references(() => usersTable.id),
  addressee_id: integer('addressee_id').notNull().references(() => usersTable.id),
  status: friendshipStatusEnum('status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  venues: many(venuesTable),
  checkins: many(checkinsTable),
  friendshipRequests: many(friendshipsTable, { relationName: 'requester' }),
  friendshipAddresses: many(friendshipsTable, { relationName: 'addressee' }),
}));

export const venuesRelations = relations(venuesTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [venuesTable.created_by],
    references: [usersTable.id],
  }),
  checkins: many(checkinsTable),
}));

export const checkinsRelations = relations(checkinsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [checkinsTable.user_id],
    references: [usersTable.id],
  }),
  venue: one(venuesTable, {
    fields: [checkinsTable.venue_id],
    references: [venuesTable.id],
  }),
}));

export const friendshipsRelations = relations(friendshipsTable, ({ one }) => ({
  requester: one(usersTable, {
    fields: [friendshipsTable.requester_id],
    references: [usersTable.id],
    relationName: 'requester',
  }),
  addressee: one(usersTable, {
    fields: [friendshipsTable.addressee_id],
    references: [usersTable.id],
    relationName: 'addressee',
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Venue = typeof venuesTable.$inferSelect;
export type NewVenue = typeof venuesTable.$inferInsert;

export type Checkin = typeof checkinsTable.$inferSelect;
export type NewCheckin = typeof checkinsTable.$inferInsert;

export type Friendship = typeof friendshipsTable.$inferSelect;
export type NewFriendship = typeof friendshipsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  venues: venuesTable,
  checkins: checkinsTable,
  friendships: friendshipsTable,
};