 
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
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

  describe('create', () => {
    it('should hash the password and create a user', async () => {
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

      const result = await service.create(dto);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          username: dto.username,
          password: 'hashedPassword',
        },
      });
      expect(result).not.toHaveProperty('password');
      expect(result.username).toBe(dto.username);
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
  });
});
