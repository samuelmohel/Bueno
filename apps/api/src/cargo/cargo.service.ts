import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CargoService {
  constructor(private prisma: PrismaService) {}
  findAll() { return this.prisma.cargoType.findMany({ where: { active: true }, orderBy: { name: 'asc' } }); }
  create(data: any) { return this.prisma.cargoType.create({ data }); }
  update(id: string, data: any) { return this.prisma.cargoType.update({ where: { id }, data }); }
}
