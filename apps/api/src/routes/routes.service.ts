import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}
  findAll() { return this.prisma.route.findMany({ where: { active: true }, include: { pricing: { where: { active: true }, orderBy: { effectiveFrom: 'desc' }, take: 1 } }, orderBy: { routeName: 'asc' } }); }
  findById(id: string) { return this.prisma.route.findUniqueOrThrow({ where: { id }, include: { pricing: { where: { active: true }, take: 1 } } }); }
  create(data: any) { return this.prisma.route.create({ data }); }
  update(id: string, data: any) { return this.prisma.route.update({ where: { id }, data }); }
}
