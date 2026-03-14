import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InformationController } from './information/information.controller';

@Module({
  imports: [],
  controllers: [AppController, InformationController],
  providers: [AppService],
})
export class AppModule {}
