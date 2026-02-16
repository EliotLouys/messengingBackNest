import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import type { RequestWithUser } from '../common/types/express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Récupérer mon profil' })
  @Get('meta')
  getProfile(@Req() req: RequestWithUser) {
    return this.usersService.findOneById(req.user.id);
  }

  @ApiOperation({ summary: 'Mettre à jour mon profil' })
  @Patch('meta')
  updateProfile(@Req() req: RequestWithUser, @Body() body: { username: string }) {
    return this.usersService.update(req.user.id, body);
  }
}
