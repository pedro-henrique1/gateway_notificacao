import { config } from '../config/config.js';
import { getNotificationById, updateNotificationStatus } from '../database/prisma.js';
import { FailingNotificationEmailProvider } from '../provider/failingNotificationEmailProvider.js';
import { FakeNotificationProvider } from '../provider/fakeNotificationEmailProvider.js';
import type { NotificationJob } from '../queue/rabbitmq.js';

const randomFailProvider = new FakeNotificationProvider();
const failingProvider = new FailingNotificationEmailProvider();

function getNotificationProvider() {
  return config.NOTIFICATION_PROVIDER_MODE === 'always-fail' ? failingProvider : randomFailProvider;
}

export async function deliverNotification(job: NotificationJob): Promise<void> {
  const notification = await getNotificationById(job.notificationId);

  if (!notification) {
    throw new Error(`Notification ${job.notificationId} was not found`);
  }

  await getNotificationProvider().send(notification);
  await updateNotificationStatus(notification.id, 'SENT');
}