import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as Minio from 'minio';
import { Readable } from 'stream';
import { File, FileDocument } from './schemas/file.schema';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly minioClient: Minio.Client;
  private readonly bucket: string;
  private readonly maxFileSize: number;

  constructor(
    @InjectModel(File.name) private fileModel: Model<FileDocument>,
    private redisService: RedisService,
  ) {
    this.bucket = process.env.MINIO_BUCKET || 'travel-files';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760');

    const endPoint = (process.env.MINIO_ENDPOINT || 'localhost').split(':')[0];
    const port = parseInt(process.env.MINIO_PORT || '9000');
    const useSSL = process.env.MINIO_USE_SSL === 'true';
    const accessKey = process.env.MINIO_ACCESS_KEY || '';
    const secretKey = process.env.MINIO_SECRET_KEY || '';

    this.logger.log(`Connecting to MinIO: ${endPoint}:${port}`);

    this.minioClient = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    this.initBucket();
  }

  private async initBucket(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucket);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucket);
        this.logger.log(`Bucket ${this.bucket} created`);
      }
    } catch (error) {
      this.logger.error(`Failed to init bucket: ${error.message}`);
    }
  }

  private getFileCacheKey(fileId: string): string {
    return `wp:files:${fileId}:meta`;
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
  ): Promise<FileDocument> {
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds limit of ${this.maxFileSize} bytes`,
      );
    }

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} not allowed. Allowed: ${allowedMimeTypes.join(', ')}`,
      );
    }

    const objectKey = `${userId}/${Date.now()}-${file.originalname}`;
    const fileBuffer = file.buffer;

    await this.minioClient.putObject(
      this.bucket,
      objectKey,
      fileBuffer,
      file.size,
      {
        'Content-Type': file.mimetype,
      },
    );

    const fileDoc = new this.fileModel({
      originalName: file.originalname,
      objectKey,
      size: file.size,
      mimetype: file.mimetype,
      bucket: this.bucket,
      userId: new Types.ObjectId(userId),
    });

    await fileDoc.save();
    return fileDoc;
  }

  async getFileStream(
    fileId: string,
    userId: string,
  ): Promise<{ stream: Readable; metadata: FileDocument }> {
    const cacheKey = this.getFileCacheKey(fileId);
    let file = await this.redisService.get<FileDocument>(cacheKey);

    if (!file) {
      file = await this.fileModel
        .findOne({
          _id: new Types.ObjectId(fileId),
          userId: new Types.ObjectId(userId),
          deletedAt: null,
        })
        .exec();

      if (!file) {
        throw new NotFoundException('File not found');
      }

      await this.redisService.set(cacheKey, file, 300);
    }

    const stream = await this.minioClient.getObject(
      this.bucket,
      file.objectKey,
    );
    return { stream, metadata: file };
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await this.fileModel
      .findOne({
        _id: new Types.ObjectId(fileId),
        userId: new Types.ObjectId(userId),
        deletedAt: null,
      })
      .exec();

    if (!file) {
      throw new NotFoundException('File not found');
    }

    file.deletedAt = new Date();
    await file.save();

    await this.redisService.del(this.getFileCacheKey(fileId));

    try {
      await this.minioClient.removeObject(this.bucket, file.objectKey);
    } catch (error) {
      this.logger.warn(`Failed to remove file from MinIO: ${error.message}`);
    }
  }

  async validateFileOwnership(
    fileId: string,
    userId: string,
  ): Promise<boolean> {
    const file = await this.fileModel
      .findOne({
        _id: new Types.ObjectId(fileId),
        userId: new Types.ObjectId(userId),
        deletedAt: null,
      })
      .exec();
    return !!file;
  }
}
