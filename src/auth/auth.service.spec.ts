import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
	hash: jest.fn().mockResolvedValue('hashedRt'),
	compare: jest.fn(),
}));

describe('AuthService', () => {
	let service: AuthService;

	const mockUsersService = {
		findOne: jest.fn(),
	};

	const mockJwtService = {
		signAsync: jest.fn(),
	};

	const mockPrismaService = {
		user: {
			update: jest.fn(),
			updateMany: jest.fn(),
			findUnique: jest.fn(),
		},
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{ provide: UsersService, useValue: mockUsersService },
				{ provide: JwtService, useValue: mockJwtService },
				{ provide: PrismaService, useValue: mockPrismaService },
			],
		}).compile();

		service = module.get<AuthService>(AuthService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('getTokens', () => {
		it('should generate access and refresh tokens', async () => {
			mockJwtService.signAsync.mockResolvedValueOnce('at-token').mockResolvedValueOnce('rt-token');

			const result = await service.getTokens(1, 'testuser');

			expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
				1,
				{ sub: 1, username: 'testuser' },
				expect.objectContaining({ secret: expect.any(String), expiresIn: '15m' }),
			);
			expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
				2,
				{ sub: 1, username: 'testuser' },
				expect.objectContaining({ secret: expect.any(String), expiresIn: '7d' }),
			);
			expect(result).toEqual({ access_token: 'at-token', refresh_token: 'rt-token' });
		});
	});

	describe('updateRefreshTokenHash', () => {
		it('should hash refresh token and update database', async () => {
			await service.updateRefreshTokenHash(1, 'rt-token');

			expect(bcrypt.hash).toHaveBeenCalledWith('rt-token', 10);
			expect(mockPrismaService.user.update).toHaveBeenCalledWith({
				where: { id: 1 },
				data: { hashedRefreshToken: 'hashedRt' },
			});
		});
	});

	describe('login', () => {
		it('should return tokens and save refresh token hash', async () => {
			const getTokensSpy = jest.spyOn(service, 'getTokens').mockResolvedValue({
				access_token: 'at',
				refresh_token: 'rt',
			});
			const updateRtHashSpy = jest.spyOn(service, 'updateRefreshTokenHash').mockResolvedValue(undefined);

			const result = await service.login({ id: 1, username: 'user' });

			expect(getTokensSpy).toHaveBeenCalledWith(1, 'user');
			expect(updateRtHashSpy).toHaveBeenCalledWith(1, 'rt');
			expect(result).toEqual({ access_token: 'at', refresh_token: 'rt' });
		});
	});

	describe('logout', () => {
		it('should set hashedRefreshToken to null', async () => {
			mockPrismaService.user.updateMany.mockResolvedValue({ count: 1 });

			const result = await service.logout(1);

			expect(mockPrismaService.user.updateMany).toHaveBeenCalledWith({
				where: {
					id: 1,
					hashedRefreshToken: { not: null },
				},
				data: { hashedRefreshToken: null },
			});
			expect(result).toEqual({ loggedOut: true });
		});
	});

	describe('refreshTokens', () => {
		it('should refresh tokens if refresh token matches', async () => {
			const user = { id: 1, username: 'user', hashedRefreshToken: 'hashedRt' };
			mockPrismaService.user.findUnique.mockResolvedValue(user);
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);

			const getTokensSpy = jest.spyOn(service, 'getTokens').mockResolvedValue({
				access_token: 'new-at',
				refresh_token: 'new-rt',
			});
			const updateRtHashSpy = jest.spyOn(service, 'updateRefreshTokenHash').mockResolvedValue(undefined);

			const result = await service.refreshTokens(1, 'rt');

			expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
			expect(bcrypt.compare).toHaveBeenCalledWith('rt', 'hashedRt');
			expect(getTokensSpy).toHaveBeenCalledWith(1, 'user');
			expect(updateRtHashSpy).toHaveBeenCalledWith(1, 'new-rt');
			expect(result).toEqual({ access_token: 'new-at', refresh_token: 'new-rt' });
		});

		it('should throw ForbiddenException if user not found or has no hashed rt', async () => {
			mockPrismaService.user.findUnique.mockResolvedValue(null);

			await expect(service.refreshTokens(1, 'rt')).rejects.toThrow(ForbiddenException);
		});

		it('should throw ForbiddenException if refresh token does not match', async () => {
			const user = { id: 1, username: 'user', hashedRefreshToken: 'hashedRt' };
			mockPrismaService.user.findUnique.mockResolvedValue(user);
			(bcrypt.compare as jest.Mock).mockResolvedValue(false);

			await expect(service.refreshTokens(1, 'rt')).rejects.toThrow(ForbiddenException);
		});
	});

	describe('validateUser', () => {
		it('should return user info without password if passwords match', async () => {
			const user = { id: 1, username: 'user', password: 'hashedPassword' };
			mockUsersService.findOne.mockResolvedValue(user);
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);

			const result = await service.validateUser('user', 'password');

			expect(mockUsersService.findOne).toHaveBeenCalledWith('user');
			expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
			expect(result).toEqual({ id: 1, username: 'user' });
		});

		it('should return null if passwords do not match', async () => {
			const user = { id: 1, username: 'user', password: 'hashedPassword' };
			mockUsersService.findOne.mockResolvedValue(user);
			(bcrypt.compare as jest.Mock).mockResolvedValue(false);

			const result = await service.validateUser('user', 'wrong');
			expect(result).toBeNull();
		});

		it('should return null if user not found', async () => {
			mockUsersService.findOne.mockResolvedValue(null);

			const result = await service.validateUser('none', 'pwd');
			expect(result).toBeNull();
		});
	});
});
