import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_POLICY, USERNAME_POLICY } from '@gaming-platform/shared';

export class RegisterDto {
  @ApiProperty({ example: 'player@example.com', format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'player_one', minLength: USERNAME_POLICY.MIN_LENGTH })
  @IsString()
  @MinLength(USERNAME_POLICY.MIN_LENGTH)
  @MaxLength(USERNAME_POLICY.MAX_LENGTH)
  @Matches(USERNAME_POLICY.PATTERN, {
    message: 'Username may only contain letters, numbers, and underscores',
  })
  username!: string;

  @ApiProperty({ example: 'Sup3rSecret!', minLength: PASSWORD_POLICY.MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_POLICY.MIN_LENGTH)
  @MaxLength(PASSWORD_POLICY.MAX_LENGTH)
  @Matches(PASSWORD_POLICY.PATTERN, {
    message: 'Password must contain an uppercase letter, a lowercase letter, and a number',
  })
  password!: string;
}
