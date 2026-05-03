import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trip, TripDocument } from '../../database/schemas/trip.schema';
import { RedisService } from '../../common/redis/redis.service';
import {
  RequestAddTripDto,
  RequestUpdateTripDto,
  RequestGetTripsByFilterDto,
} from './dto/trips.dto';

@Injectable()
export class TripsService {
  private readonly CACHE_PREFIX = 'wp:trips';

  constructor(
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    private redisService: RedisService,
  ) {}

  private getListCacheKey(filters: RequestGetTripsByFilterDto): string {
    const { page, pageSize, destination, status, minPrice, maxPrice } = filters;
    const params = new URLSearchParams();

    params.append('page', String(page));
    params.append('pageSize', String(pageSize));

    if (destination) params.append('destination', destination);
    if (status) params.append('status', status);
    if (minPrice) params.append('minPrice', String(minPrice));
    if (maxPrice) params.append('maxPrice', String(maxPrice));

    return `${this.CACHE_PREFIX}:list:${params.toString()}`;
  }

  private getItemCacheKey(id: string): string {
    return `${this.CACHE_PREFIX}:item:${id}`;
  }

  private async invalidateListCache(): Promise<void> {
    await this.redisService.delByPattern(`${this.CACHE_PREFIX}:list:*`);
  }

  async create(dto: RequestAddTripDto): Promise<Trip> {
    const trip = new this.tripModel(dto);
    const saved = await trip.save();
    await this.invalidateListCache();
    return saved.toObject() as Trip;
  }

  async findAll(
    page: number,
    pageSize: number,
    filters?: RequestGetTripsByFilterDto,
  ): Promise<any> {
    const cacheKey = this.getListCacheKey({
      page,
      pageSize,
      ...filters,
    } as RequestGetTripsByFilterDto);

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const skip = (page - 1) * pageSize;
    const filter: any = { deletedAt: null };

    if (filters?.destination) filter.destination = filters.destination;
    if (filters?.status) filter.status = filters.status;
    if (filters?.minPrice !== undefined)
      filter.price = { $gte: filters.minPrice };
    if (filters?.maxPrice !== undefined)
      filter.price = { ...filter.price, $lte: filters.maxPrice };

    const [data, total] = await Promise.all([
      this.tripModel
        .find(filter)
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 })
        .exec(),
      this.tripModel.countDocuments(filter),
    ]);

    const result = {
      data: data.map((doc) => doc.toObject()),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    await this.redisService.set(cacheKey, result);
    return result;
  }

  async findOne(id: string): Promise<Trip> {
    const cacheKey = this.getItemCacheKey(id);

    const cached = await this.redisService.get<Trip>(cacheKey);
    if (cached) {
      return cached;
    }

    const trip = await this.tripModel
      .findOne({ _id: id, deletedAt: null })
      .exec();
    if (!trip) {
      throw new NotFoundException('Поездка не найдена');
    }

    const result = trip.toObject() as Trip;
    await this.redisService.set(cacheKey, result);
    return result;
  }

  async update(id: string, dto: RequestUpdateTripDto): Promise<Trip> {
    const trip = await this.tripModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: dto },
        { new: true },
      )
      .exec();

    if (!trip) {
      throw new NotFoundException('Поездка не найдена');
    }

    await this.redisService.del(this.getItemCacheKey(id));
    await this.invalidateListCache();

    return trip.toObject() as Trip;
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.tripModel
      .updateOne(
        { _id: id, deletedAt: null },
        { $set: { deletedAt: new Date() } },
      )
      .exec();

    if (result.matchedCount === 0) {
      throw new NotFoundException('Поездка не найдена');
    }

    await this.redisService.del(this.getItemCacheKey(id));
    await this.invalidateListCache();
  }
}
