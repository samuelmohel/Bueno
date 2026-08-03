import { PartialType } from '@nestjs/mapped-types';
import { CreateWagonDto } from './create-wagon.dto';

export class UpdateWagonDto extends PartialType(CreateWagonDto) {}