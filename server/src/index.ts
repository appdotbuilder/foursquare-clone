import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  createVenueInputSchema,
  searchVenuesInputSchema,
  createCheckinInputSchema,
  createFriendshipInputSchema,
  updateFriendshipInputSchema,
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUserProfile } from './handlers/get_user_profile';
import { updateUser } from './handlers/update_user';
import { createVenue } from './handlers/create_venue';
import { searchVenues } from './handlers/search_venues';
import { getVenue } from './handlers/get_venue';
import { createCheckin } from './handlers/create_checkin';
import { getUserCheckins } from './handlers/get_user_checkins';
import { createFriendship } from './handlers/create_friendship';
import { updateFriendship } from './handlers/update_friendship';
import { getUserFriends } from './handlers/get_user_friends';
import { getFriendshipRequests } from './handlers/get_friendship_requests';
import { removeFriendship } from './handlers/remove_friendship';
import { getActivityFeed } from './handlers/get_activity_feed';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUserProfile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserProfile(input.userId)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Venue management
  createVenue: publicProcedure
    .input(createVenueInputSchema)
    .mutation(({ input }) => createVenue(input)),

  searchVenues: publicProcedure
    .input(searchVenuesInputSchema)
    .query(({ input }) => searchVenues(input)),

  getVenue: publicProcedure
    .input(z.object({ venueId: z.number() }))
    .query(({ input }) => getVenue(input.venueId)),

  // Check-in management
  createCheckin: publicProcedure
    .input(createCheckinInputSchema)
    .mutation(({ input }) => createCheckin(input)),

  getUserCheckins: publicProcedure
    .input(z.object({ 
      userId: z.number(),
      limit: z.number().positive().max(100).optional()
    }))
    .query(({ input }) => getUserCheckins(input.userId, input.limit)),

  // Friend management
  createFriendship: publicProcedure
    .input(createFriendshipInputSchema)
    .mutation(({ input }) => createFriendship(input)),

  updateFriendship: publicProcedure
    .input(updateFriendshipInputSchema)
    .mutation(({ input }) => updateFriendship(input)),

  getUserFriends: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserFriends(input.userId)),

  getFriendshipRequests: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getFriendshipRequests(input.userId)),

  removeFriendship: publicProcedure
    .input(z.object({ friendshipId: z.number() }))
    .mutation(({ input }) => removeFriendship(input.friendshipId)),

  // Activity feed
  getActivityFeed: publicProcedure
    .input(z.object({ 
      userId: z.number(),
      limit: z.number().positive().max(100).optional()
    }))
    .query(({ input }) => getActivityFeed(input.userId, input.limit)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();