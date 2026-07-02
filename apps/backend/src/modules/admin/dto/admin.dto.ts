import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ description: 'Role id to assign' })
  @IsUUID()
  roleId!: string;
}

export class CreateRoleDto {
  @ApiProperty({ example: 'Support Agent' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Privilege level (higher = more powerful)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  level?: number;

  @ApiPropertyOptional({ type: [String], description: 'Permission ids to grant' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  permissionIds?: string[];
}

export class SetRolePermissionsDto {
  @ApiProperty({ type: [String], description: 'Permission ids the role should have' })
  @IsArray()
  @IsUUID('all', { each: true })
  permissionIds!: string[];
}

export class LockUserDto {
  @ApiPropertyOptional({ description: 'Reason recorded in the security log' })
  @IsOptional()
  @IsString()
  reason?: string;
}
