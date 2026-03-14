import { Controller, Get } from '@nestjs/common';

@Controller('info')
export class InformationController {
  @Get()
  getInformation() {
    const today = new Date();
    const year = today.getFullYear();
    const nextYear = new Date(year + 1, 0, 1);

    const difference = nextYear.getTime() - today.getTime();
    const daysBeforeNewYear = Math.ceil(difference / (1000 * 60 * 60 * 24));

    return { days_before_new_year: daysBeforeNewYear };
  }
}
