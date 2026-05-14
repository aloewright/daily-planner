import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('User', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatar: text('avatar'),
  createdAt: text('createdAt').notNull().default(sql`(strftime('%Y-%m-%d %H:%M:%S', 'now'))`),
  updatedAt: text('updatedAt').notNull().default(sql`(strftime('%Y-%m-%d %H:%M:%S', 'now'))`),
})

export const channels = sqliteTable('Channel', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#f59e0b'),
  contextId: text('contextId'),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
})

export const tasks = sqliteTable('Task', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  notes: text('notes').notNull().default(''),
  channelId: text('channelId').references(() => channels.id, { onDelete: 'set null' }),
  startDate: text('startDate'),
  dueDate: text('dueDate'),
  scheduledTime: text('scheduledTime'),
  plannedTime: integer('plannedTime').notNull().default(0),
  actualTime: integer('actualTime').notNull().default(0),
  timerStartedAt: text('timerStartedAt'),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  completedAt: text('completedAt'),
  priority: text('priority').notNull().default('normal'),
  backlogStatus: text('backlogStatus'),
  sortOrder: integer('sortOrder').notNull().default(0),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  recurring: text('recurring'),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('createdAt').notNull().default(sql`(strftime('%Y-%m-%d %H:%M:%S', 'now'))`),
  updatedAt: text('updatedAt').notNull().default(sql`(strftime('%Y-%m-%d %H:%M:%S', 'now'))`),
})

export const subtasks = sqliteTable('Subtask', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  plannedTime: integer('plannedTime').notNull().default(0),
  actualTime: integer('actualTime').notNull().default(0),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sortOrder').notNull().default(0),
  taskId: text('taskId').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
})

export const comments = sqliteTable('Comment', {
  id: text('id').primaryKey(),
  body: text('body').notNull(),
  taskId: text('taskId').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull().references(() => users.id),
  createdAt: text('createdAt').notNull().default(sql`(strftime('%Y-%m-%d %H:%M:%S', 'now'))`),
})

export const weeklyObjectives = sqliteTable('WeeklyObjective', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  weekStart: text('weekStart').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('createdAt').notNull().default(sql`(strftime('%Y-%m-%d %H:%M:%S', 'now'))`),
})

export const dailyPlans = sqliteTable('DailyPlan', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  obstacles: text('obstacles').notNull().default(''),
  sharedAt: text('sharedAt'),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
})

export const dailyPlanTasks = sqliteTable('DailyPlanTask', {
  id: text('id').primaryKey(),
  dailyPlanId: text('dailyPlanId').notNull().references(() => dailyPlans.id, { onDelete: 'cascade' }),
  taskId: text('taskId').notNull().references(() => tasks.id),
  sortOrder: integer('sortOrder').notNull().default(0),
})

export const userSettings = sqliteTable('UserSettings', {
  userId: text('userId').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  timezone: text('timezone').notNull().default('America/New_York'),
  timeFormat: text('timeFormat').notNull().default('12h'),
  startOfWeek: text('startOfWeek').notNull().default('monday'),
  workStartTime: text('workStartTime').notNull().default('09:00'),
  workEndTime: text('workEndTime').notNull().default('17:00'),
  dailyPlanningTime: text('dailyPlanningTime').notNull().default('09:00'),
  weeklyPlanningDay: text('weeklyPlanningDay').notNull().default('monday'),
  weeklyPlanningTime: text('weeklyPlanningTime').notNull().default('09:00'),
  automatedDailyPlanning: integer('automatedDailyPlanning', { mode: 'boolean' }).notNull().default(false),
  automatedShutdown: integer('automatedShutdown', { mode: 'boolean' }).notNull().default(false),
  endOfDayMessage: text('endOfDayMessage').notNull().default('daily-encouragement'),
  countPlannedAsActual: integer('countPlannedAsActual', { mode: 'boolean' }).notNull().default(false),
  autoSortTasks: integer('autoSortTasks', { mode: 'boolean' }).notNull().default(false),
  aiChannelRecs: integer('aiChannelRecs', { mode: 'boolean' }).notNull().default(true),
  aiTimerRecs: integer('aiTimerRecs', { mode: 'boolean' }).notNull().default(true),
  aiSummaries: integer('aiSummaries', { mode: 'boolean' }).notNull().default(false),
  onboardingCompleted: integer('onboardingCompleted', { mode: 'boolean' }).notNull().default(false),
})

// Better Auth tables (prefixed to avoid case-insensitive collision with `User`)
export const authUsers = sqliteTable('ba_user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
})

export const authSessions = sqliteTable('ba_session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
})

export const authAccounts = sqliteTable('ba_account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
})

export const authVerifications = sqliteTable('ba_verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }),
})
