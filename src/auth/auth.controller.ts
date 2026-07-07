import {
	Controller,
	Post,
	Body,
	UseGuards,
	Req,
	HttpCode,
	HttpStatus,
	UnauthorizedException,
	ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthCredentialsDto, RegisterDto } from '../common/dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express'; // Standard Express Request
import { JwtPayload, JwtPayloadWithRt } from '../common/types/express';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(
		private authService: AuthService,
		private usersService: UsersService,
		private configService: ConfigService,
	) {}

	@Post('login')
	@ApiOperation({ summary: "Connexion à l'API" })
	async login(@Body() dto: AuthCredentialsDto) {
		const user = await this.authService.validateUser(dto.username, dto.password); // verifies the user is registered and password is correct
		if (!user) throw new UnauthorizedException('Invalid credentials');

		return this.authService.login(user);
	}

	@Post('register')
	@ApiOperation({ summary: "Enregistrement d'un nouveau compte utilisateur" })
	async register(@Body() dto: RegisterDto) {
		const envCode = this.configService.get<string>('REGISTRATION_CODE');

		// checks if the user has the registration code before registering them
		if (envCode && envCode.trim() !== '') {
			if (!dto.registrationCode || dto.registrationCode.trim() !== envCode.trim()) {
				throw new ForbiddenException("Code d'invitation invalide ou manquant");
			}
		}

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
