import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsNumber,
  Min,
  IsOptional,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RequestAddTripDto {
  @ApiProperty({
    example: 'Путешествие в Сочи',
    description: 'Название поездки',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiPropertyOptional({
    example: 'Отдых на море с семьей',
    description: 'Описание поездки',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'Сочи',
    description: 'Направление/город назначения',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  destination!: string;

  @ApiProperty({
    example: '2026-07-01',
    description: 'Дата начала поездки (формат YYYY-MM-DD)',
    required: true,
  })
  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    example: '2026-07-10',
    description: 'Дата окончания поездки (формат YYYY-MM-DD)',
    required: true,
  })
  @IsNotEmpty()
  @IsDateString()
  endDate!: string;

  @ApiProperty({
    example: 50000,
    description: 'Стоимость поездки в рублях',
    minimum: 0,
    required: true,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({
    example: 'planned',
    description: 'Статус поездки',
    enum: ['planned', 'ongoing', 'completed', 'cancelled'],
    default: 'planned',
  })
  @IsOptional()
  @IsIn(['planned', 'ongoing', 'completed', 'cancelled'])
  status?: string;
}

export class RequestUpdateTripDto {
  @ApiPropertyOptional({
    example: 'Путешествие в Адлер',
    description: 'Название поездки',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: 'Отличный отдых',
    description: 'Описание поездки',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'Адлер',
    description: 'Направление/город назначения',
  })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({
    example: '2026-07-15',
    description: 'Дата начала поездки (формат YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-07-25',
    description: 'Дата окончания поездки (формат YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 60000,
    description: 'Стоимость поездки в рублях',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    example: 'ongoing',
    description: 'Статус поездки',
    enum: ['planned', 'ongoing', 'completed', 'cancelled'],
  })
  @IsOptional()
  @IsIn(['planned', 'ongoing', 'completed', 'cancelled'])
  status?: string;
}

export class RequestGetTripsByFilterDto {
  @ApiProperty({
    example: 1,
    description: 'Номер страницы',
    required: true,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  page!: number;

  @ApiProperty({
    example: 10,
    description: 'Количество записей на странице',
    required: true,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  pageSize!: number;

  @ApiPropertyOptional({
    example: 'Сочи',
    description: 'Фильтр по направлению',
  })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({
    example: 'planned',
    description: 'Фильтр по статусу',
    enum: ['planned', 'ongoing', 'completed', 'cancelled'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    example: 10000,
    description: 'Минимальная стоимость',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    example: 100000,
    description: 'Максимальная стоимость',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;
}

export class TripResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID поездки',
  })
  id!: string;

  @ApiProperty({
    example: 'Путешествие в Сочи',
    description: 'Название поездки',
  })
  title!: string;

  @ApiPropertyOptional({
    example: 'Отдых на море',
    description: 'Описание поездки',
  })
  description?: string;

  @ApiProperty({
    example: 'Сочи',
    description: 'Направление',
  })
  destination!: string;

  @ApiProperty({
    example: '2026-07-01',
    description: 'Дата начала',
  })
  startDate!: Date;

  @ApiProperty({
    example: '2026-07-10',
    description: 'Дата окончания',
  })
  endDate!: Date;

  @ApiProperty({
    example: 50000,
    description: 'Стоимость',
  })
  price!: number;

  @ApiProperty({
    example: 'planned',
    description: 'Статус',
    enum: ['planned', 'ongoing', 'completed', 'cancelled'],
  })
  status!: string;

  @ApiProperty({
    example: '2026-01-01T12:00:00.000Z',
    description: 'Дата создания',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-01-01T12:00:00.000Z',
    description: 'Дата обновления',
  })
  updatedAt!: Date;
}

export class PaginatedTripsResponseDto {
  @ApiProperty({
    type: [TripResponseDto],
    description: 'Массив поездок',
  })
  data!: TripResponseDto[];

  @ApiProperty({
    description: 'Мета-информация о пагинации',
  })
  meta!: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
