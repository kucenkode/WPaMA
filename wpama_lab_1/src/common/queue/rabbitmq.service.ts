import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly logger = new Logger(RabbitMQService.name);

  async onModuleInit() {
    await this.connect();
    await this.setupExchangesAndQueues();
  }

  private async connect() {
    const host = process.env.RABBITMQ_HOST || 'localhost';
    const port = process.env.RABBITMQ_PORT || '5672';
    const user = process.env.RABBITMQ_USER || 'guest';
    const pass = process.env.RABBITMQ_PASS || 'guest';

    const url = `amqp://${user}:${pass}@${host}:${port}`;
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
    this.logger.log('Connected to RabbitMQ');
  }

  private async setupExchangesAndQueues() {
    await this.channel.assertExchange('app.events', 'direct', {
      durable: true,
    });
    await this.channel.assertExchange('app.dlx', 'direct', { durable: true });

    const queueName =
      process.env.QUEUE_USER_REGISTERED || 'wp.auth.user.registered';

    await this.channel.assertQueue(queueName, {
      durable: true,
      deadLetterExchange: 'app.dlx',
      deadLetterRoutingKey: 'user.registered',
    });
    await this.channel.bindQueue(queueName, 'app.events', 'user.registered');

    await this.channel.assertQueue(`${queueName}.dlq`, { durable: true });
    await this.channel.bindQueue(
      `${queueName}.dlq`,
      'app.dlx',
      'user.registered',
    );

    this.logger.log('Exchanges and queues configured');
  }

  async publish(
    exchange: string,
    routingKey: string,
    payload: object,
  ): Promise<void> {
    const message = Buffer.from(JSON.stringify(payload));
    this.channel.publish(exchange, routingKey, message, { persistent: true });
    this.logger.debug(`Published to ${exchange}/${routingKey}`);
  }

  async consume(
    queue: string,
    handler: (msg: amqp.Message) => Promise<void>,
  ): Promise<void> {
    await this.channel.consume(
      queue,
      async (msg) => {
        if (msg) await handler(msg);
      },
      { noAck: false },
    );
    this.logger.log(`Consumer started for queue: ${queue}`);
  }

  ack(msg: amqp.Message): void {
    this.channel.ack(msg);
  }

  nack(msg: amqp.Message, requeue: boolean): void {
    this.channel.nack(msg, false, requeue);
  }
}
