import { Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { Pool } from 'pg';

interface NotificationItem {
  id: string;
  title: string;
  meta: string;
  severity: 'high' | 'medium' | 'info' | 'low';
}

const currentUserId = 'super.admin@cars24.com';

const seededNotifications: NotificationItem[] = [
  { id: 'n1', title: 'Engineering Agent latency crossed 2s', meta: 'High · 2m ago', severity: 'high' },
  { id: 'n2', title: 'Webhook fallback scrape enabled', meta: 'Info · 32m ago', severity: 'info' },
  { id: 'n3', title: 'Quality Agent failed tasks increased', meta: 'Medium · 15m ago', severity: 'medium' },
  { id: 'n4', title: 'Vehicle Data Sync workflow started', meta: 'Info · 1h ago', severity: 'info' },
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://platform:platform@localhost:5432/agent_platform',
});

let schemaReady: Promise<void> | null = null;

@Controller('api/notifications')
export class NotificationsController {
  @Get()
  async listNotifications() {
    await ensureSchema();
    const readIds = await getReadNotificationIds(currentUserId);
    const notifications = seededNotifications.map((notification) => ({
      ...notification,
      read: readIds.has(notification.id),
    }));

    return {
      notifications,
      unread_count: notifications.filter((notification) => !notification.read).length,
    };
  }

  @Post('read')
  async markNotificationsRead() {
    await ensureSchema();
    await markRead(currentUserId, seededNotifications.map((notification) => notification.id));

    return { ok: true };
  }

  @Post(':notificationId/read')
  async markNotificationRead(@Param('notificationId') notificationId: string) {
    if (!seededNotifications.some((notification) => notification.id === notificationId)) {
      throw new NotFoundException('Notification not found');
    }

    await ensureSchema();
    await markRead(currentUserId, [notificationId]);

    return { ok: true };
  }
}

async function ensureSchema() {
  schemaReady ??= pool.query(`
    create table if not exists notification_reads (
      user_id text not null,
      notification_id text not null,
      read_at timestamptz not null default now(),
      primary key (user_id, notification_id)
    )
  `).then(() => undefined);

  return schemaReady;
}

async function getReadNotificationIds(userId: string): Promise<Set<string>> {
  const result = await pool.query<{ notification_id: string }>(
    'select notification_id from notification_reads where user_id = $1',
    [userId],
  );
  return new Set(result.rows.map((row) => row.notification_id));
}

async function markRead(userId: string, notificationIds: string[]) {
  if (!notificationIds.length) return;

  await pool.query(
    `
      insert into notification_reads (user_id, notification_id, read_at)
      select $1, notification_id, now()
      from unnest($2::text[]) as notification_id
      on conflict (user_id, notification_id)
      do update set read_at = excluded.read_at
    `,
    [userId, notificationIds],
  );
}
