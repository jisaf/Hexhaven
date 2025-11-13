import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameGateway } from './websocket/game.gateway';
import { RoomsController } from './api/rooms.controller';
import { ScenariosController } from './api/scenarios.controller';
import { ScenarioService } from './services/scenario.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', '..', 'frontend', 'dist'),
      exclude: ['/api*', '/socket.io*'],
    }),
  ],
  controllers: [AppController, RoomsController, ScenariosController],
  providers: [AppService, GameGateway, ScenarioService],
})
export class AppModule {}
