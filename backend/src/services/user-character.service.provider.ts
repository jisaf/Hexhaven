
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UserCharacterService as UserCharacterServiceImpl } from './user-character.service';

@Injectable()
export class UserCharacterService extends UserCharacterServiceImpl {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
}
