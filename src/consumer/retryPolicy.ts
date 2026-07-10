import { config } from '../config/config.js';
import { updateNotificationStatus } from '../database/prisma.js';
import { publishToQueue, type NotificationJob } from '../queue/rabbitmq.js';

export const MAX_RETRY_ATTEMPTS = 3;
export const MAX_DELIVERY_ATTEMPTS = MAX_RETRY_ATTEMPTS + 1;

export function getRetryAttempt(message: { properties: { headers?: Record<string, unknown> } }): number {
  const attempt = message.properties.headers?.['x-retry-attempt'];

  if (typeof attempt === 'number' && Number.isInteger(attempt) && attempt >= 1) {
    return attempt;
  }

  if (typeof attempt === 'string') {
    const parsedAttempt = Number(attempt);

    if (Number.isInteger(parsedAttempt) && parsedAttempt >= 1) {
      return parsedAttempt;
    }
  }

  return 1;
}

export async function moveToRetryQueue(job: NotificationJob, attempt: number): Promise<void> {
  const nextAttempt = attempt + 1;

  if (nextAttempt === 2) {
    await publishToQueue(config.RABBITMQ_RETRY_1M_QUEUE, job, nextAttempt);
    return;
  }

  if (nextAttempt === 3) {
    await publishToQueue(config.RABBITMQ_RETRY_5M_QUEUE, job, nextAttempt);
    return;
  }

  if (nextAttempt === 4) {
    await publishToQueue(config.RABBITMQ_RETRY_15M_QUEUE, job, nextAttempt);
    return;
  }

  throw new Error(`Invalid retry attempt: ${nextAttempt}`);
}

export async function moveToDlq(job: NotificationJob, attempt: number): Promise<void> {
  await publishToQueue(config.RABBITMQ_DLQ_QUEUE, job, attempt);
  await updateNotificationStatus(job.notificationId, 'FAILED');
}