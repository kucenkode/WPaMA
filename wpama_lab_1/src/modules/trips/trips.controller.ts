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
} from '@nestjs/common';
import {
  RequestAddTripDto,
  RequestUpdateTripDto,
  RequestGetTripsByFilterDto,
} from './dto/trips.dto';
import { TripsService } from './trips.service';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: RequestAddTripDto) {
    return this.tripsService.create(dto);
  }

  @Get()
  findAll(@Query() query: RequestGetTripsByFilterDto) {
    return this.tripsService.findAll(query.page, query.pageSize);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tripsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: RequestUpdateTripDto) {
    return this.tripsService.update(id, dto);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() dto: RequestUpdateTripDto) {
    return this.tripsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tripsService.softDelete(id);
  }
}
