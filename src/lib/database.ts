/**
 * Database Module - Legacy Entry Point
 *
 * This file now re-exports from the modular database structure.
 * For new code, prefer importing directly from './database' which points to the index.
 *
 * The database has been split into organized modules:
 * - users.js: User management and profiles
 * - testimonies.js: Testimony CRUD and analytics
 * - messages.js: Direct messaging and reactions
 * - groups.js: Group management and messaging
 * - friends.js: Friend requests and connections
 * - subscriptions.js: Real-time subscriptions
 */

export * from './database/index.js';
