import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@bueno.ng' }) @IsEmail() email: string;
  @ApiProperty({ example: 'password123' }) @IsString() password: string;
}
