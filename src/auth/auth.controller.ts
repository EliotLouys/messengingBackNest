import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthCredentialsDto } from '../common/dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express'; // Standard Express Request
import { JwtPayload, JwtPayloadWithRt } from '../common/types/express';
import { UsersService } from '../users/users.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('login')
  async login(@Body() dto: AuthCredentialsDto) {
    const user = await this.authService.validateUser(dto.username, dto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() dto: AuthCredentialsDto) {
    return this.usersService.create(dto);
  }

  @ApiOperation({ summary: 'Logout (Supprime le refresh token)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.authService.logout(user.sub);
  }

  @ApiOperation({ summary: 'Rafraîchir le token' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt-refresh')) // Utilise RtStrategy
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshTokens(@Req() req: Request) {
    const user = req.user as JwtPayloadWithRt;
    return this.authService.refreshTokens(user.sub, user.refreshToken);
  }
}
