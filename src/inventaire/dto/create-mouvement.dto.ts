/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MouvementType {
  IN = 'IN',
  OUT = 'OUT',
}

export class CreateMouvementDto {
  @IsUUID()
  @IsString()
  ingredientId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsEnum(MouvementType)
  type: MouvementType;
}
