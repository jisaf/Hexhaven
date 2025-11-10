import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameGateway } from './websocket/game.gateway';
import { RoomsController } from './api/rooms.controller';

@Module({
  imports: [],
  controllers: [AppController, RoomsController],
  providers: [AppService, GameGateway],
})
export class AppModule {}
