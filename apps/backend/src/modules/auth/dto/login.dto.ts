import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'player@example.com', format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Sup3rSecret!', minLength: 1 })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({ description: 'Extend the session lifetime', default: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
