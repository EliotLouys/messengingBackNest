import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashedPassword'),
}));

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    device: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    channel: {
      findFirst: jest.fn(),
    },
    channelMember: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should find one user by username', async () => {
      const user = { id: 1, username: 'testuser' };
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.findOne('testuser');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(result).toBe(user);
    });
  });

  describe('create', () => {
    it('should hash the password, create a user and add to General channel', async () => {
      const dto = { username: 'newuser', password: 'password123' };
      const createdUser = {
        id: 1,
        username: dto.username,
        password: 'hashedPassword',
        img: 'http://example.com',
        display_name: 'Super display name',
        status: 'I love to code this',
        createdAt: new Date(),
        notificationsEnabled: true,
      };

      mockPrismaService.user.create.mockResolvedValue(createdUser);
      mockPrismaService.channel.findFirst.mockResolvedValue({ id: 10, name: 'Général' });

      const result = await service.create(dto);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          username: dto.username,
          password: 'hashedPassword',
        },
      });
      expect(mockPrismaService.channelMember.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          channelId: 10,
          role: 'member',
        },
      });
      expect(result).not.toHaveProperty('password');
      expect(result.username).toBe(dto.username);
    });

    it('should fallback to first channel if General does not exist', async () => {
      const dto = { username: 'newuser', password: 'password123' };
      const createdUser = {
        id: 1,
        username: dto.username,
        password: 'hashedPassword',
      };

      mockPrismaService.user.create.mockResolvedValue(createdUser);
      // General channel not found
      mockPrismaService.channel.findFirst
        .mockResolvedValueOnce(null) // first findFirst query for "General"
        .mockResolvedValueOnce({ id: 20, name: 'Random' }); // second findFirst fallback

      await service.create(dto);

      expect(mockPrismaService.channelMember.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          channelId: 20,
          role: 'member',
        },
      });
    });

    it('should throw ConflictException if username already exists', async () => {
      const dto = { username: 'existinguser', password: 'password123' };
      
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.22.0',
        }
      );

      mockPrismaService.user.create.mockRejectedValue(prismaError);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should propagate other errors', async () => {
      const dto = { username: 'user', password: 'password' };
      const randomError = new Error('Database down');
      mockPrismaService.user.create.mockRejectedValue(randomError);

      await expect(service.create(dto)).rejects.toThrow(randomError);
    });
  });

  describe('findOneById', () => {
    it('should return user info (without password & rt) if user exists', async () => {
      const user = {
        id: 1,
        username: 'test',
        password: 'hash',
        hashedRefreshToken: 'rt',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.findOneById(1);
      expect(result).toEqual({ id: 1, username: 'test' });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.findOneById(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update user and return user info without password & rt', async () => {
      const updatedUser = {
        id: 1,
        username: 'updated',
        password: 'hash',
        hashedRefreshToken: 'rt',
      };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(1, { username: 'updated' });
      expect(result).toEqual({ id: 1, username: 'updated' });
    });

    it('should throw ConflictException on P2002', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.22.0',
        }
      );
      mockPrismaService.user.update.mockRejectedValue(prismaError);

      await expect(service.update(1, { username: 'dup' })).rejects.toThrow(ConflictException);
    });

    it('should propagate other errors', async () => {
      const randomError = new Error('Failed');
      mockPrismaService.user.update.mockRejectedValue(randomError);

      await expect(service.update(1, { username: 'dup' })).rejects.toThrow(randomError);
    });
  });

  describe('findManyByUsernames', () => {
    it('should return selected fields for matched usernames', async () => {
      const usersList = [
        { username: 'user1', display_name: 'U1', img: null, status: null },
      ];
      mockPrismaService.user.findMany.mockResolvedValue(usersList);

      const result = await service.findManyByUsernames(['user1']);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          username: { in: ['user1'] },
        },
        select: {
          username: true,
          display_name: true,
          img: true,
          status: true,
        },
      });
      expect(result).toBe(usersList);
    });
  });

  describe('addDeviceToken', () => {
    it('should upsert the device token', async () => {
      const device = { id: 1, token: 'token123', userId: 42 };
      mockPrismaService.device.upsert.mockResolvedValue(device);

      const result = await service.addDeviceToken(42, 'token123');
      expect(mockPrismaService.device.upsert).toHaveBeenCalledWith({
        where: { token: 'token123' },
        update: { userId: 42 },
        create: { token: 'token123', userId: 42 },
      });
      expect(result).toBe(device);
    });
  });

  describe('removeDeviceToken', () => {
    it('should delete matching device tokens', async () => {
      mockPrismaService.device.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.removeDeviceToken(42, 'token123');
      expect(mockPrismaService.device.deleteMany).toHaveBeenCalledWith({
        where: { token: 'token123', userId: 42 },
      });
      expect(result).toEqual({ count: 1 });
    });
  });
});
