/* eslint-disable @typescript-eslint/no-unused-vars */
import { ForbiddenException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/types/express';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
	constructor(
		private usersService: UsersService,
		private jwtService: JwtService,
		private prisma: PrismaService,
	) {}

	// Builds JWT tokens
	async getTokens(userId: number, username: string) {
		const payload: JwtPayload = { sub: userId, username };

		const [accessToken, refreshToken] = await Promise.all([
			this.jwtService.signAsync(payload, {
				secret: process.env.JWT_SECRET || 'AT-SECRET',
				expiresIn: '15m',
			}),
			this.jwtService.signAsync(payload, {
				secret: process.env.RT_SECRET || 'RT-SECRET',
				expiresIn: '7d',
			}),
		]);

		return { access_token: accessToken, refresh_token: refreshToken };
	}

	// Updates the refresh token on login or refreshing auth
	async updateRefreshTokenHash(userId: number, rt: string) {
		const hash = await bcrypt.hash(rt, 10);
		await this.prisma.user.update({
			where: { id: userId },
			data: { hashedRefreshToken: hash },
		});
	}

	async login(user: { id: number; username: string }) {
		const tokens = await this.getTokens(user.id, user.username);
		await this.updateRefreshTokenHash(user.id, tokens.refresh_token);
		return tokens;
	}

	// Empties user's current refresh token on logout
	async logout(userId: number) {
		await this.prisma.user.updateMany({
			where: {
				id: userId,
				hashedRefreshToken: { not: null },
			},
			data: { hashedRefreshToken: null },
		});
		return { loggedOut: true };
	}

	// Refreshes the user's access to the API
	async refreshTokens(userId: number, rt: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user || !user.hashedRefreshToken) throw new ForbiddenException('Access Denied');

		const rtMatches = await bcrypt.compare(rt, user.hashedRefreshToken);
		if (!rtMatches) throw new ForbiddenException('Access Denied');

		const tokens = await this.getTokens(user.id, user.username);
		await this.updateRefreshTokenHash(user.id, tokens.refresh_token);
		return tokens;
	}

	// Validates the user's username and password (whether user exists and password is correct)
	async validateUser(username: string, pass: string): Promise<Omit<User, 'password' | 'hashedRefreshToken'> | null> {
		const user = await this.usersService.findOne(username);
		console.log(`${username} is trying to login.`);

		if (user && (await bcrypt.compare(pass, user.password))) {
			const { password, ...result } = user;
			return result;
		}
		return null;
	}
}
