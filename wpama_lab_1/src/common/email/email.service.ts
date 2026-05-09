import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '465');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    this.logger.log('SMTP transporter configured');
  }

  async sendWelcomeEmail(to: string, displayName: string): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: 'Welcome to Travel App!',
      text: `Hello ${displayName},\n\nThank you for registering in Travel App!\n\nBest regards,\nTravel Team`,
      html: `
        <h1>Welcome, ${displayName}!</h1>
        <p>Thank you for registering in <strong>Travel App</strong>.</p>
        <p>You can now login and start planning your trips.</p>
        <hr>
        <small>Travel App Team</small>
      `,
    });
    this.logger.log(`Welcome email sent to ${to}`);
  }
}
