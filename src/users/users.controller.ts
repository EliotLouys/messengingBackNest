import { Controller, Get, Patch, Body, UseGuards, Req, Post, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import type { RequestWithUser } from '../common/types/express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Device } from '@prisma/client';

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

	@ApiOperation({ summary: 'Récupérer plusieurs profils via leurs usernames' })
	@Post('batch')
	getUsersBatch(@Body() body: { usernames: string[] }) {
		return this.usersService.findManyByUsernames(body.usernames);
	}

	@ApiOperation({ summary: "Stocker le push token d'expo en bdd" })
	@Post('push-token')
	async addPushToken(@Req() req: RequestWithUser, @Body() body: { token: string }): Promise<Device> {
		const userId = req.user.id;

		return this.usersService.addDeviceToken(userId, body.token);
	}

	@ApiOperation({ summary: "Supprimer le push token d'expo en bdd" })
	@Delete('push-token')
	async removePushToken(@Req() req: RequestWithUser, @Body() body: { token: string }) {
		const userId = Number(req.user.id);

		return await this.usersService.removeDeviceToken(userId, body.token);
	}
}
