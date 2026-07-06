import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { JwtService } from '@nestjs/jwt';

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockSocket = (auth: any = {}, headers: any = {}) => {
    return {
      id: 'socket-id-123',
      handshake: {
        auth,
        headers,
      },
      data: {},
      disconnect: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    } as any;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should connect successfully with auth token', async () => {
      const client = mockSocket({ token: 'Bearer valid-token' });
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 1, username: 'testuser' });

      await gateway.handleConnection(client);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: expect.any(String),
      });
      expect(client.data.user).toEqual({ sub: 1, username: 'testuser' });
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should connect successfully with header token', async () => {
      const client = mockSocket(undefined, { authorization: 'Bearer valid-header-token' });
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 1, username: 'testuser' });

      await gateway.handleConnection(client);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-header-token', {
        secret: expect.any(String),
      });
      expect(client.data.user).toEqual({ sub: 1, username: 'testuser' });
    });

    it('should disconnect if no token is provided', async () => {
      const client = mockSocket({}, {});

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should disconnect if token verification fails', async () => {
      const client = mockSocket({ token: 'invalid' });
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should log disconnect if user exists', () => {
      const client = mockSocket();
      client.data.user = { username: 'testuser' };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      gateway.handleDisconnect(client);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('WS Disconnected: testuser'));
      consoleSpy.mockRestore();
    });

    it('should do nothing if user data is missing', () => {
      const client = mockSocket();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      gateway.handleDisconnect(client);
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('handleJoinChannel', () => {
    it('should join the channel room', () => {
      const client = mockSocket();
      client.data.user = { username: 'testuser' };

      const result = gateway.handleJoinChannel(client, 42);

      expect(client.join).toHaveBeenCalledWith('channel_42');
      expect(result).toEqual({ event: 'joined', message: 'Joined channel 42' });
    });
  });

  describe('handleLeaveChannel', () => {
    it('should leave the channel room', () => {
      const client = mockSocket();
      client.data.user = { username: 'testuser' };

      gateway.handleLeaveChannel(client, 42);

      expect(client.leave).toHaveBeenCalledWith('channel_42');
    });
  });
});
