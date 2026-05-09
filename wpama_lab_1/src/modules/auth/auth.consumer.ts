import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from 'src/common/queue/rabbitmq.service';
import { EmailService } from 'src/common/email/email.service';
import { RedisService } from 'src/common/redis/redis.service';

@Injectable()
export class AuthConsumer implements OnModuleInit {
  private readonly logger = new Logger(AuthConsumer.name);

  constructor(
    private rabbitMQService: RabbitMQService,
    private emailService: EmailService,
    private redisService: RedisService,
  ) {}

  async onModuleInit() {
    const queue =
      process.env.QUEUE_USER_REGISTERED || 'wp.auth.user.registered';

    setTimeout(async () => {
      try {
        await this.rabbitMQService.consume(queue, this.handle.bind(this));
        this.logger.log(`Consumer started for queue: ${queue}`);
      } catch (error) {
        this.logger.error(`Failed to start consumer: ${error.message}`);
      }
    }, 3000);
  }

  private async handle(msg: any): Promise<void> {
    const content = JSON.parse(msg.content.toString());
    const { eventId, payload, metadata } = content;

    this.logger.log(`Received message: ${eventId}`);

    const processed = await this.redisService.get(`processed:${eventId}`);
    if (processed) {
      this.logger.log(`Event ${eventId} already processed, skipping`);
      return this.rabbitMQService.ack(msg);
    }

    try {
      await this.emailService.sendWelcomeEmail(
        payload.email,
        payload.displayName,
      );
      await this.redisService.set(`processed:${eventId}`, 'true', 86400);
      this.rabbitMQService.ack(msg);
      this.logger.log(`Event ${eventId} processed successfully`);
    } catch (error) {
      this.logger.error(`Failed to process ${eventId}: ${error.message}`);

      const currentAttempt = metadata.attempt || 1;

      if (currentAttempt >= 3) {
        this.logger.error(
          `Max retries exceeded for ${eventId}, sending to DLQ`,
        );
        this.rabbitMQService.nack(msg, false);
      } else {
        metadata.attempt = currentAttempt + 1;
        this.logger.warn(`Retry attempt ${metadata.attempt} for ${eventId}`);

        const updatedEvent = {
          eventId,
          eventType: content.eventType,
          timestamp: content.timestamp,
          payload,
          metadata,
        };
        await this.rabbitMQService.publish(
          'app.events',
          'user.registered',
          updatedEvent,
        );
        this.rabbitMQService.ack(msg);
      }
    }
  }
}
