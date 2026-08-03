import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateWagonDto {
  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @Type(() => Number)
  @IsInt()
  capacityTonnes: number;

  @Type(() => Number)
  @IsInt()
  manufactureYear: number;

  @IsString()
  wagonType: string;
}