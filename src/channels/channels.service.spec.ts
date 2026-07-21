import { Test, TestingModule } from '@nestjs/testing';
import { ChannelsService } from './channels.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('ChannelsService', () => {
	let service: ChannelsService;

	const mockPrismaService = {
		channel: {
			findMany: jest.fn(),
			findUnique: jest.fn(),
			create: jest.fn(),
			delete: jest.fn(),
			update: jest.fn(),
		},
		channelMember: {
			create: jest.fn(),
			deleteMany: jest.fn(),
		},
		message: {
			create: jest.fn(),
			findMany: jest.fn(),
		},
	};

	const mockChatGateway = {
		server: {
			to: jest.fn().mockReturnThis(),
			emit: jest.fn(),
		},
	};

	const mockNotificationsService = {
		sendToChannelMembers: jest.fn().mockResolvedValue(undefined),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ChannelsService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: ChatGateway, useValue: mockChatGateway },
				{ provide: NotificationsService, useValue: mockNotificationsService },
			],
		}).compile();

		service = module.get<ChannelsService>(ChannelsService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('findChannels', () => {
		it('should find channels for user and deserialize theme JSON', async () => {
			const channel = {
				id: 1,
				name: 'General',
				theme: '{"primaryColor": "red"}',
				members: [{ role: 'member', user: { username: 'user1' } }],
			};
			mockPrismaService.channel.findMany.mockResolvedValue([channel]);

			const result = await service.findChannels(1);

			expect(mockPrismaService.channel.findMany).toHaveBeenCalled();
			expect(result[0].theme).toEqual({ primaryColor: 'red' });
		});

		it('should return null theme if theme field is falsy', async () => {
			const channel = {
				id: 1,
				name: 'General',
				theme: null,
				members: [],
			};
			mockPrismaService.channel.findMany.mockResolvedValue([channel]);

			const result = await service.findChannels(1);
			expect(result[0].theme).toBeNull();
		});
	});

	describe('findOne', () => {
		it('should return a channel if found', async () => {
			const channel = {
				id: 1,
				name: 'General',
				theme: '{"primaryColor": "blue"}',
				members: [],
			};
			mockPrismaService.channel.findUnique.mockResolvedValue(channel);

			const result = await service.findOne(1);

			expect(mockPrismaService.channel.findUnique).toHaveBeenCalledWith({
				where: { id: 1 },
				include: expect.any(Object),
			});
			expect(result.theme).toEqual({ primaryColor: 'blue' });
		});

		it('should throw NotFoundException if channel not found', async () => {
			mockPrismaService.channel.findUnique.mockResolvedValue(null);

			await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
		});
	});

	describe('create', () => {
		it('should create channel successfully and serialize theme JSON', async () => {
			const dto = { name: 'Ch1', img: 'img', theme: { primaryColor: 'red' } };
			const createdChannel = { id: 1, name: 'Ch1', theme: '{"primaryColor": "red"}' };
			mockPrismaService.channel.create.mockResolvedValue(createdChannel);

			const result = await service.create(dto, 42);

			expect(mockPrismaService.channel.create).toHaveBeenCalledWith({
				data: {
					name: 'Ch1',
					img: 'img',
					theme: '{"primaryColor":"red"}',
					creatorId: 42,
					members: {
						create: { userId: 42, role: 'admin' },
					},
				},
			});
			expect(result).toBe(createdChannel);
		});

		it('should throw ConflictException on P2002 error', async () => {
			const dto = { name: 'Ch1' };
			const prismaError = new Prisma.PrismaClientKnownRequestError('Err', {
				code: 'P2002',
				clientVersion: '1.0',
			});
			mockPrismaService.channel.create.mockRejectedValue(prismaError);

			await expect(service.create(dto, 42)).rejects.toThrow(ConflictException);
		});

		it('should propagate other errors', async () => {
			const dto = { name: 'Ch1' };
			const error = new Error('Database connection failed');
			mockPrismaService.channel.create.mockRejectedValue(error);

			await expect(service.create(dto, 42)).rejects.toThrow(error);
		});
	});

	describe('delete', () => {
		it('should delete a channel', async () => {
			mockPrismaService.channel.delete.mockResolvedValue({ id: 1 });

			const result = await service.delete(1);
			expect(mockPrismaService.channel.delete).toHaveBeenCalledWith({ where: { id: 1 } });
			expect(result).toEqual({ id: 1 });
		});

		it('should throw NotFoundException on P2025 error', async () => {
			const prismaError = new Prisma.PrismaClientKnownRequestError('Err', {
				code: 'P2025',
				clientVersion: '1.0',
			});
			mockPrismaService.channel.delete.mockRejectedValue(prismaError);

			await expect(service.delete(1)).rejects.toThrow(NotFoundException);
		});

		it('should propagate other errors', async () => {
			const error = new Error('Delete failed');
			mockPrismaService.channel.delete.mockRejectedValue(error);

			await expect(service.delete(1)).rejects.toThrow(error);
		});
	});

	describe('updateMetadata', () => {
		it('should update channel successfully', async () => {
			const dto = { name: 'NewName', img: 'newImg', theme: { primaryColor: 'green' } };
			mockPrismaService.channel.update.mockResolvedValue({ id: 1, name: 'NewName' });

			const result = await service.updateMetadata(dto, 1);

			expect(mockPrismaService.channel.update).toHaveBeenCalledWith({
				where: { id: 1 },
				data: {
					name: 'NewName',
					img: 'newImg',
					theme: '{"primaryColor":"green"}',
				},
			});
			expect(result).toEqual({ id: 1, name: 'NewName' });
		});

		it('should throw NotFoundException on P2025', async () => {
			const dto = { name: 'Name' };
			const prismaError = new Prisma.PrismaClientKnownRequestError('Err', {
				code: 'P2025',
				clientVersion: '1.0',
			});
			mockPrismaService.channel.update.mockRejectedValue(prismaError);

			await expect(service.updateMetadata(dto, 1)).rejects.toThrow(NotFoundException);
		});

		it('should throw ConflictException on P2002', async () => {
			const dto = { name: 'Name' };
			const prismaError = new Prisma.PrismaClientKnownRequestError('Err', {
				code: 'P2002',
				clientVersion: '1.0',
			});
			mockPrismaService.channel.update.mockRejectedValue(prismaError);

			await expect(service.updateMetadata(dto, 1)).rejects.toThrow(ConflictException);
		});

		it('should propagate other errors', async () => {
			const dto = { name: 'Name' };
			const error = new Error('Err');
			mockPrismaService.channel.update.mockRejectedValue(error);

			await expect(service.updateMetadata(dto, 1)).rejects.toThrow(error);
		});
	});

	describe('putInChannel', () => {
		it('should create channel member', async () => {
			mockPrismaService.channelMember.create.mockResolvedValue({ userId: 2, channelId: 1 });

			const result = await service.putInChannel(1, 2);
			expect(mockPrismaService.channelMember.create).toHaveBeenCalledWith({
				data: { userId: 2, channelId: 1 },
			});
			expect(result).toEqual({ userId: 2, channelId: 1 });
		});

		it('should throw ConflictException on P2002', async () => {
			const prismaError = new Prisma.PrismaClientKnownRequestError('Err', {
				code: 'P2002',
				clientVersion: '1.0',
			});
			mockPrismaService.channelMember.create.mockRejectedValue(prismaError);

			await expect(service.putInChannel(1, 2)).rejects.toThrow(ConflictException);
		});

		it('should throw NotFoundException on P2003', async () => {
			const prismaError = new Prisma.PrismaClientKnownRequestError('Err', {
				code: 'P2003',
				clientVersion: '1.0',
			});
			mockPrismaService.channelMember.create.mockRejectedValue(prismaError);

			await expect(service.putInChannel(1, 2)).rejects.toThrow(NotFoundException);
		});

		it('should propagate other errors', async () => {
			const error = new Error('Err');
			mockPrismaService.channelMember.create.mockRejectedValue(error);

			await expect(service.putInChannel(1, 2)).rejects.toThrow(error);
		});
	});

	describe('removeFromChannel', () => {
		it('should delete channel member', async () => {
			mockPrismaService.channelMember.deleteMany.mockResolvedValue({ count: 1 });

			const result = await service.removeFromChannel(1, 2);
			expect(mockPrismaService.channelMember.deleteMany).toHaveBeenCalledWith({
				where: { channelId: 1, userId: 2 },
			});
			expect(result).toEqual({ success: true });
		});

		it('should throw NotFoundException if count is 0', async () => {
			mockPrismaService.channelMember.deleteMany.mockResolvedValue({ count: 0 });

			await expect(service.removeFromChannel(1, 2)).rejects.toThrow(NotFoundException);
		});
	});

	describe('sendMessage', () => {
		it('should create message, emit websocket event and trigger notifications', async () => {
			const dto = { content: 'hello', type: 'Text' };
			const createdMessage = {
				id: 10,
				content: 'hello',
				type: 'Text',
				channelId: 1,
				authorId: 2,
				author: { id: 2, username: 'sender' },
			};
			mockPrismaService.message.create.mockResolvedValue(createdMessage);

			const channelWithMembers = {
				id: 1,
				members: [{ user: { id: 3, username: 'recipient', devices: [] } }],
			};
			mockPrismaService.channel.findUnique = jest.fn().mockResolvedValue(channelWithMembers);

			const result = await service.sendMessage(dto, 1, 2);

			expect(mockPrismaService.message.create).toHaveBeenCalledWith({
				data: {
					content: 'hello',
					type: 'Text',
					channelId: 1,
					authorId: 2,
				},
				include: {
					author: { select: { id: true, username: true } },
				},
			});
			expect(mockChatGateway.server.to).toHaveBeenCalledWith('channel_1');
			expect(mockChatGateway.server.emit).toHaveBeenCalledWith('message', createdMessage);
			expect(mockNotificationsService.sendToChannelMembers).toHaveBeenCalledWith(
				[expect.objectContaining({ id: 3 })],
				'sender',
				'hello',
				1,
			);
			expect(result).toBe(createdMessage);
		});

		it('should default type to Text if not specified', async () => {
			const dto = { content: 'hello' };
			const createdMessage = {
				id: 10,
				content: 'hello',
				type: 'Text',
				channelId: 1,
				authorId: 2,
				author: { id: 2, username: 'sender' },
			};
			mockPrismaService.message.create.mockResolvedValue(createdMessage);
			mockPrismaService.channel.findUnique = jest.fn().mockResolvedValue(null);

			await service.sendMessage(dto, 1, 2);

			expect(mockPrismaService.message.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ type: 'Text' }),
				}),
			);
		});
	});

	describe('getMessages', () => {
		it('should return messages for valid channel', async () => {
			mockPrismaService.channel.findUnique = jest.fn().mockResolvedValue({ id: 1 });
			const messagesList = [{ id: 1, content: 'msg' }];
			mockPrismaService.message.findMany.mockResolvedValue(messagesList);

			const result = await service.getMessages(1, 0, 10);

			expect(mockPrismaService.message.findMany).toHaveBeenCalledWith({
				where: { channelId: 1 },
				orderBy: { createdAt: 'desc' },
				skip: 0,
				take: 10,
				include: {
					author: { select: { id: true, username: true } },
				},
			});
			expect(result).toBe(messagesList);
		});

		it('should throw NotFoundException if channel does not exist', async () => {
			mockPrismaService.channel.findUnique = jest.fn().mockResolvedValue(null);

			await expect(service.getMessages(99)).rejects.toThrow(NotFoundException);
		});
	});
});
