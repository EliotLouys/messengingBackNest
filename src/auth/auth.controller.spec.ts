/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RegisterDto } from '../common/dto/login.dto';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;
  let usersService: UsersService;

  const mockUsersService = {
    create: jest.fn(),
  };

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    refreshTokens: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => process.env[key]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.REGISTRATION_CODE;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const expectedResult = {
      id: 1,
      username: 'testuser',
      display_name: 'Super display name',
      img: 'http://example.com',
      status: 'I love to code this',
      createdAt: new Date(),
      notificationsEnabled: true,
    };

    it('should call usersService.create and return the result if no REGISTRATION_CODE is set', async () => {
      const dto: RegisterDto = {
        username: 'testuser',
        password: 'password123',
      };

      mockUsersService.create.mockResolvedValue(expectedResult);

      const result = await controller.register(dto);

      expect(usersService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });

    it('should register successfully if REGISTRATION_CODE matches', async () => {
      process.env.REGISTRATION_CODE = 'secret_code';
      const dto: RegisterDto = {
        username: 'testuser',
        password: 'password123',
        registrationCode: 'secret_code',
      };

      mockUsersService.create.mockResolvedValue(expectedResult);

      const result = await controller.register(dto);

      expect(usersService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });

    it('should throw ForbiddenException if REGISTRATION_CODE is set but missing in request', async () => {
      process.env.REGISTRATION_CODE = 'secret_code';
      const dto: RegisterDto = {
        username: 'testuser',
        password: 'password123',
      };

      await expect(controller.register(dto)).rejects.toThrow(ForbiddenException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if REGISTRATION_CODE is set but wrong in request', async () => {
      process.env.REGISTRATION_CODE = 'secret_code';
      const dto: RegisterDto = {
        username: 'testuser',
        password: 'password123',
        registrationCode: 'wrong_code',
      };

      await expect(controller.register(dto)).rejects.toThrow(ForbiddenException);
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });
});
