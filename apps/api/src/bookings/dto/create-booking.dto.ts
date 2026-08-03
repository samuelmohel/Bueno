import { IsString, IsNumber, IsOptional, Min, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty() @IsUUID() routeId: string;
  @ApiProperty() @IsUUID() cargoTypeId: string;
  @ApiProperty() @IsNumber() @Min(1) cargoWeightTonnes: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() specialInstructions?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() dropOffDate?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() destinationContact?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() destinationPhone?: string;
}
