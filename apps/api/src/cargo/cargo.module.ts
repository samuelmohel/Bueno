import { Module } from '@nestjs/common';
import { CargoService } from './cargo.service';
import { CargoController } from './cargo.controller';

@Module({ providers: [CargoService], controllers: [CargoController] })
export class CargoModule {}
