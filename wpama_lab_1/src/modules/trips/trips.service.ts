import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Trip } from '../../database/entities/trip.entity';
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
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
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
    const trip = this.tripsRepository.create(dto);
    const saved = await this.tripsRepository.save(trip);
    await this.invalidateListCache();
    return saved;
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
    const [data, total] = await this.tripsRepository.findAndCount({
      where: { deletedAt: IsNull() },
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    const result = {
      data,
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

    const trip = await this.tripsRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!trip) {
      throw new NotFoundException('Поездка не найдена');
    }

    await this.redisService.set(cacheKey, trip);
    return trip;
  }

  async update(id: string, dto: RequestUpdateTripDto): Promise<Trip> {
    const trip = await this.findOne(id);
    Object.assign(trip, dto);
    const updated = await this.tripsRepository.save(trip);

    await this.redisService.del(this.getItemCacheKey(id));
    await this.invalidateListCache();

    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.tripsRepository.softDelete(id);

    await this.redisService.del(this.getItemCacheKey(id));
    await this.invalidateListCache();
  }
}
