import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RegisterDto } from '../common/dto/login.dto';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
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

  describe('login', () => {
    it('should throw UnauthorizedException if credentials are invalid', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);
      await expect(
        controller.login({ username: 'user', password: 'bad' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return login tokens if credentials are valid', async () => {
      const user = { id: 1, username: 'user' };
      const tokens = { access_token: 'at', refresh_token: 'rt' };
      mockAuthService.validateUser.mockResolvedValue(user);
      mockAuthService.login.mockResolvedValue(tokens);

      const result = await controller.login({ username: 'user', password: 'good' });
      expect(mockAuthService.validateUser).toHaveBeenCalledWith('user', 'good');
      expect(mockAuthService.login).toHaveBeenCalledWith(user);
      expect(result).toBe(tokens);
    });
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

      expect(mockUsersService.create).toHaveBeenCalledWith(dto);
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

      expect(mockUsersService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });

    it('should throw ForbiddenException if REGISTRATION_CODE is set but missing in request', async () => {
      process.env.REGISTRATION_CODE = 'secret_code';
      const dto: RegisterDto = {
        username: 'testuser',
        password: 'password123',
      };

      await expect(controller.register(dto)).rejects.toThrow(ForbiddenException);
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if REGISTRATION_CODE is set but wrong in request', async () => {
      process.env.REGISTRATION_CODE = 'secret_code';
      const dto: RegisterDto = {
        username: 'testuser',
        password: 'password123',
        registrationCode: 'wrong_code',
      };

      await expect(controller.register(dto)).rejects.toThrow(ForbiddenException);
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should call authService.logout with user ID', async () => {
      const req = { user: { sub: 42, username: 'test' } } as any;
      mockAuthService.logout.mockResolvedValue({ loggedOut: true });

      const result = await controller.logout(req);
      expect(mockAuthService.logout).toHaveBeenCalledWith(42);
      expect(result).toEqual({ loggedOut: true });
    });
  });

  describe('refreshTokens', () => {
    it('should call authService.refreshTokens with user sub and refreshToken', async () => {
      const req = { user: { sub: 42, refreshToken: 'rt-token' } } as any;
      const newTokens = { access_token: 'new-at', refresh_token: 'new-rt' };
      mockAuthService.refreshTokens.mockResolvedValue(newTokens);

      const result = await controller.refreshTokens(req);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(42, 'rt-token');
      expect(result).toBe(newTokens);
    });
  });
});
