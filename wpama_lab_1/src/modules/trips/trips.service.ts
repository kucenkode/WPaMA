import { RequestAddTripDto, RequestUpdateTripDto } from './dto/trips.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Trip } from '../../database/entities/trip.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip) // Внедряем репозиторий для работы с Trip
    private tripsRepository: Repository<Trip>,
  ) {}

  // Создание новой поездки (dto - данные для создания поездки)
  async create(dto: RequestAddTripDto) {
    const trip = this.tripsRepository.create(dto);
    return await this.tripsRepository.save(trip);
  }

  // Получение списка поездок с пагинацией
  async findAll(page: number, pageSize: number) {
    // количество записей, которые нужно пропустить
    const skip = (page - 1) * pageSize;

    // findAndCount - одновременно получает записи и их общее количество
    const [data, total] = await this.tripsRepository.findAndCount({
      where: { deletedAt: IsNull() }, // только существующие записи
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' }, // сначала новые
    });

    return {
      data, // Массив поездок
      meta: {
        total, // Всего записей в БД
        page, // Текущая страница
        pageSize, // Размер страницы
        totalPages: Math.ceil(total / pageSize), // Всего страниц
      },
    };
  }

  // Поиск поездки по id
  async findOne(id: string): Promise<Trip> {
    const trip = await this.tripsRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    // Если не нашли - показываем 404
    if (!trip) throw new NotFoundException('Мы ничего не нашли :(');

    return trip;
  }

  // Обновление поездки
  async update(id: string, dto: RequestUpdateTripDto) {
    const trip = await this.findOne(id); // Находим поездку
    Object.assign(trip, dto); // Обновляем поля поездки новыми значениями

    return await this.tripsRepository.save(trip);
  }

  // Мягкое удаление поездки (id - UUID поездки)
  async softDelete(id: string): Promise<void> {
    await this.tripsRepository.softDelete(id);
  }
}
