import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsJWT,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PASSWORD_POLICY } from '@gaming-platform/shared';

const passwordRules = {
  minLength: PASSWORD_POLICY.MIN_LENGTH,
  maxLength: PASSWORD_POLICY.MAX_LENGTH,
};

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token from the activation link' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'player@example.com', format: 'email' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token from the email link' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ minLength: passwordRules.minLength })
  @IsString()
  @MinLength(passwordRules.minLength)
  @MaxLength(passwordRules.maxLength)
  @Matches(PASSWORD_POLICY.PATTERN, {
    message: 'Password must contain an uppercase letter, a lowercase letter, and a number',
  })
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ minLength: passwordRules.minLength })
  @IsString()
  @MinLength(passwordRules.minLength)
  @MaxLength(passwordRules.maxLength)
  @Matches(PASSWORD_POLICY.PATTERN, {
    message: 'Password must contain an uppercase letter, a lowercase letter, and a number',
  })
  newPassword!: string;
}

export class RefreshDto {
  @ApiPropertyOptional({ description: 'Refresh token (also accepted via the refresh cookie)' })
  @IsOptional()
  @IsJWT()
  refreshToken?: string;
}

export class PasswordStrengthDto {
  @ApiProperty()
  @IsString()
  password!: string;
}

export class VerifyTwoFactorLoginDto {
  @ApiProperty({ description: 'Challenge token returned by the login step' })
  @IsString()
  @IsNotEmpty()
  challengeToken!: string;

  @ApiProperty({ description: 'TOTP code or recovery code', example: '123456' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class TwoFactorCodeDto {
  @ApiProperty({ description: 'TOTP code or recovery code', example: '123456' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class CreateApiKeyDto {
  @ApiProperty({ example: 'CI pipeline' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @ApiPropertyOptional({ type: [String], description: 'Scope slugs granted to the key' })
  @IsOptional()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({ description: 'Days until the key expires (omit for no expiry)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  expiresInDays?: number;
}

export class TrustDeviceDto {
  @ApiProperty({ default: true })
  @IsNotEmpty()
  trusted!: boolean;
}
