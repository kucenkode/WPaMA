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

// Создание поездки
export class RequestAddTripDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  destination!: string;

  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @IsNotEmpty()
  @IsDateString()
  endDate!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsIn(['planned', 'ongoing', 'completed', 'cancelled'])
  status?: string;
}

// Обновление поездки
export class RequestUpdateTripDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsIn(['planned', 'ongoing', 'completed', 'cancelled'])
  status?: string;
}

// Пагинация
export class RequestGetTripsByFilterDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  page!: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  pageSize!: number;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;
}
