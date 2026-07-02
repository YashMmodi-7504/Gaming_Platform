import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '@gaming-platform/types';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TrustDeviceDto } from '../dto/auth-flow.dto';
import { DeviceService } from '../services/device.service';

@ApiTags('Account Security')
@ApiBearerAuth()
@Controller('auth/devices')
export class DevicesController {
  constructor(private readonly devices: DeviceService) {}

  @Get()
  @ApiOperation({ summary: 'List devices that have accessed the account' })
  list(@CurrentUser('id') userId: string) {
    return this.devices.list(userId);
  }

  @Patch(':id/trust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a device as trusted or untrusted' })
  setTrusted(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: TrustDeviceDto,
  ) {
    return this.devices.setTrusted(user.id, id, Boolean(dto.trusted));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a device' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.devices.remove(user.id, id);
  }
}
