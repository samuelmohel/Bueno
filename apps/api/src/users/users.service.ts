import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: { fullName: string; email: string; phone?: string; role: string; password?: string }) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: data.email }, ...(data.phone ? [{ phone: data.phone }] : [])] },
    });
    if (exists) throw new ConflictException('User with this email or phone already exists');

    const passwordHash = await bcrypt.hash(data.password || 'bueno123', 10);
    const user = await this.prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: data.role || 'CUSTOMER',
        passwordHash,
        verified: true,
      },
      select: { id: true, fullName: true, email: true, phone: true, role: true, verified: true, createdAt: true },
    });

    if (data.role === 'DRIVER') {
      await this.prisma.driver.create({
        data: { userId: user.id, licenseNumber: `LIC-${Math.floor(100000 + Math.random() * 900000)}` },
      });
    }

    return user;
  }

  findAll(page=1, limit=20, role?: string) {
    const where: any = {};
    if (role) where.role = role;
    return Promise.all([
      this.prisma.user.findMany({ where, skip:(page-1)*limit, take:limit, select:{id:true,fullName:true,email:true,phone:true,role:true,verified:true,createdAt:true}, orderBy:{createdAt:'desc'} }),
      this.prisma.user.count({ where }),
    ]).then(([users, total]) => ({ users, total, page, limit, totalPages: Math.ceil(total/limit) }));
  }
  findById(id: string) {
    return this.prisma.user.findUniqueOrThrow({ where:{id}, select:{id:true,fullName:true,email:true,phone:true,role:true,verified:true,createdAt:true} });
  }
  updateProfile(id: string, data: any) {
    return this.prisma.user.update({ where:{id}, data, select:{id:true,fullName:true,email:true,phone:true,avatar:true,role:true} });
  }
  getStats() {
    return Promise.all([
      this.prisma.user.count(), this.prisma.user.count({where:{role:'CUSTOMER'}}),
      this.prisma.user.count({where:{role:'DRIVER'}}), this.prisma.user.count({where:{verified:true}}),
    ]).then(([total,customers,drivers,verified]) => ({total,customers,drivers,verified}));
  }
}

