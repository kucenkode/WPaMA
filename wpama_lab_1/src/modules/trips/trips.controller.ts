import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { TripsService } from './trips.service';
import {
  RequestAddTripDto,
  RequestUpdateTripDto,
  RequestGetTripsByFilterDto,
  TripResponseDto,
  PaginatedTripsResponseDto,
} from './dto/trips.dto';

@ApiTags('Trips')
@Controller('trips')
@UseGuards(AuthGuard)
@ApiCookieAuth()
export class TripsController {
  public constructor(private readonly tripsService: TripsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Создание поездки',
    description: 'Добавляет новую поездку для авторизованного пользователя',
  })
  @ApiBody({
    type: RequestAddTripDto,
    description: 'Данные для создания поездки',
  })
  @ApiCreatedResponse({
    description: 'Поездка успешно создана',
    type: TripResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Токен не предоставлен или невалиден',
  })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  public async create(
    @Body() dto: RequestAddTripDto,
  ): Promise<TripResponseDto> {
    const trip = await this.tripsService.create(dto);
    return trip as TripResponseDto;
  }

  @Get()
  @ApiOperation({
    summary: 'Получение всех поездок',
    description: 'Возвращает список поездок с пагинацией и фильтрацией',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: true,
    example: 1,
    description: 'Номер страницы',
  })
  @ApiQuery({
    name: 'pageSize',
    type: Number,
    required: true,
    example: 10,
    description: 'Количество записей на странице',
  })
  @ApiQuery({
    name: 'destination',
    type: String,
    required: false,
    example: 'Сочи',
    description: 'Фильтр по направлению',
  })
  @ApiQuery({
    name: 'status',
    type: String,
    required: false,
    example: 'planned',
    description: 'Фильтр по статусу',
  })
  @ApiQuery({
    name: 'minPrice',
    type: Number,
    required: false,
    example: 10000,
    description: 'Минимальная стоимость',
  })
  @ApiQuery({
    name: 'maxPrice',
    type: Number,
    required: false,
    example: 100000,
    description: 'Максимальная стоимость',
  })
  @ApiOkResponse({
    description: 'Список поездок успешно получен',
    type: PaginatedTripsResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Токен не предоставлен или невалиден',
  })
  public async findAll(
    @Query() query: RequestGetTripsByFilterDto,
  ): Promise<PaginatedTripsResponseDto> {
    return this.tripsService.findAll(query.page, query.pageSize, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Получение поездки по ID',
    description: 'Возвращает информацию о конкретной поездке по её UUID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'UUID поездки',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({ description: 'Поездка найдена', type: TripResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Токен не предоставлен или невалиден',
  })
  @ApiNotFoundResponse({ description: 'Поездка не найдена' })
  public async findOne(@Param('id') id: string): Promise<TripResponseDto> {
    const trip = await this.tripsService.findOne(id);
    return trip as TripResponseDto;
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Полное обновление поездки',
    description: 'Заменяет все поля поездки',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'UUID поездки',
  })
  @ApiBody({
    type: RequestUpdateTripDto,
    description: 'Обновленные данные поездки',
  })
  @ApiOkResponse({
    description: 'Поездка успешно обновлена',
    type: TripResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Токен не предоставлен или невалиден',
  })
  @ApiNotFoundResponse({ description: 'Поездка не найдена' })
  public async update(
    @Param('id') id: string,
    @Body() dto: RequestUpdateTripDto,
  ): Promise<TripResponseDto> {
    const trip = await this.tripsService.update(id, dto);
    return trip as TripResponseDto;
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Частичное обновление поездки',
    description: 'Обновляет только указанные поля поездки',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'UUID поездки',
  })
  @ApiBody({ type: RequestUpdateTripDto, description: 'Поля для обновления' })
  @ApiOkResponse({
    description: 'Поездка успешно обновлена',
    type: TripResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Токен не предоставлен или невалиден',
  })
  @ApiNotFoundResponse({ description: 'Поездка не найдена' })
  public async patch(
    @Param('id') id: string,
    @Body() dto: RequestUpdateTripDto,
  ): Promise<TripResponseDto> {
    const trip = await this.tripsService.update(id, dto);
    return trip as TripResponseDto;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Мягкое удаление поездки',
    description: 'Помечает поездку как удаленную (Soft Delete)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'UUID поездки',
  })
  @ApiResponse({ status: 204, description: 'Поездка успешно удалена' })
  @ApiUnauthorizedResponse({
    description: 'Токен не предоставлен или невалиден',
  })
  @ApiNotFoundResponse({ description: 'Поездка не найдена' })
  public async remove(@Param('id') id: string): Promise<void> {
    return this.tripsService.softDelete(id);
  }
}
