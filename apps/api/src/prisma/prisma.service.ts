import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Explicit model delegate definitions for TypeScript language server & IDE parity
  feederTruckLog: any;
  wagonUnloadAudit: any;
  terminalMonthlyBudget: any;
  cargoOfficerTarget: any;

  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

