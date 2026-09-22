import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  balance: real('balance').notNull().default(1000000),
  equity: real('equity').notNull().default(1000000),
});

export const positions = sqliteTable('positions', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id),
  symbol: text('symbol').notNull(),
  name: text('name').notNull(),
  quantity: real('quantity').notNull(),
  averagePrice: real('average_price').notNull(),
  currentPrice: real('current_price').notNull(),
  stopLoss: real('stop_loss'),
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id),
  symbol: text('symbol').notNull(),
  side: text('side', { enum: ['buy', 'sell'] }).notNull(),
  orderType: text('order_type', { enum: ['market', 'limit', 'stop'] }).notNull(),
  quantity: real('quantity').notNull(),
  limitPrice: real('limit_price'),
  stopPrice: real('stop_price'),
  status: text('status', { enum: ['pending', 'executed', 'cancelled'] }).notNull().default('pending'),
  executedPrice: real('executed_price'),
  createdAt: text('created_at').notNull(), // ISO string
});

export const trades = sqliteTable('trades', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id),
  symbol: text('symbol').notNull(),
  side: text('side', { enum: ['buy', 'sell'] }).notNull(),
  entryPrice: real('entry_price').notNull(),
  exitPrice: real('exit_price'),
  quantity: real('quantity').notNull(),
  realisedPnl: real('realised_pnl').notNull().default(0),
  returnPct: real('return_pct').notNull().default(0),
  reason: text('reason'),
  mistake: text('mistake'),
  confidence: integer('confidence'),
  journalStatus: text('journal_status', { enum: ['complete', 'needs_review'] }).notNull().default('needs_review'),
  executedAt: text('executed_at').notNull(),
  plannedStop: real('planned_stop'),
});

export const insertUserSchema = createInsertSchema(users);
export const insertAccountSchema = createInsertSchema(accounts);
export const insertPositionSchema = createInsertSchema(positions);
export const insertOrderSchema = createInsertSchema(orders);
export const insertTradeSchema = createInsertSchema(trades);

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Trade = typeof trades.$inferSelect;