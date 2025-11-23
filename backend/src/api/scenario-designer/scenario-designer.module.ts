import { Module } from '@nestjs/common';
import { ScenarioDesignerController } from './scenario-designer.controller';
import { ScenarioDesignerService } from './scenario-designer.service';

@Module({
  controllers: [ScenarioDesignerController],
  providers: [ScenarioDesignerService],
})
export class ScenarioDesignerModule {}
