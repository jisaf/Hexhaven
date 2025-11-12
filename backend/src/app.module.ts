import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameGateway } from './websocket/game.gateway';
import { RoomsController } from './api/rooms.controller';
import { ScenariosController } from './api/scenarios.controller';
import { ScenarioService } from './services/scenario.service';

@Module({
  imports: [],
  controllers: [AppController, RoomsController, ScenariosController],
  providers: [AppService, GameGateway, ScenarioService],
})
export class AppModule {}
