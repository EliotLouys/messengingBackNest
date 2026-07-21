import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
	let controller: UsersController;

	const mockUsersService = {
		findOneById: jest.fn(),
		update: jest.fn(),
		findManyByUsernames: jest.fn(),
		addDeviceToken: jest.fn(),
		removeDeviceToken: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [UsersController],
			providers: [{ provide: UsersService, useValue: mockUsersService }],
		}).compile();

		controller = module.get<UsersController>(UsersController);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('getProfile', () => {
		it('should return user profile', async () => {
			const mockUser = { id: 42, username: 'test' };
			mockUsersService.findOneById.mockResolvedValue(mockUser);
			const req = { user: { id: 42, username: 'test' } } as any;

			const result = await controller.getProfile(req);
			expect(mockUsersService.findOneById).toHaveBeenCalledWith(42);
			expect(result).toBe(mockUser);
		});
	});

	describe('updateProfile', () => {
		it('should update user profile', async () => {
			const mockUser = { id: 42, username: 'updated' };
			mockUsersService.update.mockResolvedValue(mockUser);
			const req = { user: { id: 42, username: 'test' } } as any;
			const body = { username: 'updated' };

			const result = await controller.updateProfile(req, body);
			expect(mockUsersService.update).toHaveBeenCalledWith(42, body);
			expect(result).toBe(mockUser);
		});
	});

	describe('getUsersBatch', () => {
		it('should batch fetch user profiles by username', async () => {
			const mockResult = [{ username: 'user1' }];
			mockUsersService.findManyByUsernames.mockResolvedValue(mockResult);
			const body = { usernames: ['user1'] };

			const result = await controller.getUsersBatch(body);
			expect(mockUsersService.findManyByUsernames).toHaveBeenCalledWith(['user1']);
			expect(result).toBe(mockResult);
		});
	});

	describe('addPushToken', () => {
		it('should add device token', async () => {
			const mockDevice = { id: 1, token: 'tok', userId: 42 };
			mockUsersService.addDeviceToken.mockResolvedValue(mockDevice);
			const req = { user: { id: 42 } } as any;
			const body = { token: 'tok' };

			const result = await controller.addPushToken(req, body);
			expect(mockUsersService.addDeviceToken).toHaveBeenCalledWith(42, 'tok');
			expect(result).toBe(mockDevice);
		});
	});

	describe('removePushToken', () => {
		it('should remove device token', async () => {
			mockUsersService.removeDeviceToken.mockResolvedValue({ count: 1 });
			const req = { user: { id: 42 } } as any;
			const body = { token: 'tok' };

			const result = await controller.removePushToken(req, body);
			expect(mockUsersService.removeDeviceToken).toHaveBeenCalledWith(42, 'tok');
			expect(result).toEqual({ count: 1 });
		});
	});
});
