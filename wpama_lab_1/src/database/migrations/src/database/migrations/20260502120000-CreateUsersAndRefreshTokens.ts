import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndRefreshTokens20260502120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Включить расширение UUID (если ещё не включено)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Создание таблицы users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password_hash" character varying,
        "salt" character varying,
        "yandex_id" character varying,
        "vk_id" character varying,
        "is_oauth_user" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    // Создание таблицы refresh_tokens
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token_hash" character varying NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "revoked" boolean NOT NULL DEFAULT false,
        "revoked_at" TIMESTAMP,
        "user_agent" character varying,
        "ip_address" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Создание индексов для производительности
    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens"("user_id");
      CREATE INDEX "IDX_refresh_tokens_expires_at" ON "refresh_tokens"("expires_at");
      CREATE INDEX "IDX_users_email" ON "users"("email");
      CREATE INDEX "IDX_users_deleted_at" ON "users"("deleted_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
