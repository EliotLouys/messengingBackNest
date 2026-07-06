import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { Device, User } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(async () => {
    process.env.RELAY_SECRET = 'secret123';
    process.env.RELAY_URL = 'http://localhost:4000/push';

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendToChannelMembers', () => {
    const user1: User & { devices: Device[] } = {
      id: 1,
      username: 'user1',
      password: 'pwd',
      hashedRefreshToken: null,
      display_name: 'U1',
      img: null,
      status: null,
      notificationsEnabled: true,
      createdAt: new Date(),
      devices: [
        { id: 1, token: 'ExponentPushToken[token1]', userId: 1 },
        { id: 2, token: 'invalid_token', userId: 1 }, // invalid token prefix
      ],
    };

    const user2: User & { devices: Device[] } = {
      id: 2,
      username: 'user2',
      password: 'pwd',
      hashedRefreshToken: null,
      display_name: 'U2',
      img: null,
      status: null,
      notificationsEnabled: false, // notifications disabled
      createdAt: new Date(),
      devices: [{ id: 3, token: 'ExponentPushToken[token2]', userId: 2 }],
    };

    it('should send notifications successfully to valid active devices', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('ok'),
      });
      global.fetch = fetchMock;

      await service.sendToChannelMembers([user1, user2], 'sender', 'Hello world', 42);

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer secret123',
        },
        body: JSON.stringify([
          {
            to: 'ExponentPushToken[token1]',
            sound: 'default',
            title: 'Nouveau message de sender',
            body: 'Hello world',
            data: { channel_id: 42 },
            priority: 'high',
            channelId: 'high_priority_messages',
          },
        ]),
      });
    });

    it('should early return if no messages to send', async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock;

      // Passing user2 who has notifications disabled
      await service.sendToChannelMembers([user2], 'sender', 'Hello', 42);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should warn and early return if RELAY_SECRET is missing', async () => {
      delete process.env.RELAY_SECRET;
      
      // Re-create service without RELAY_SECRET
      const module: TestingModule = await Test.createTestingModule({
        providers: [NotificationsService],
      }).compile();
      const tempService = module.get<NotificationsService>(NotificationsService);

      const fetchMock = jest.fn();
      global.fetch = fetchMock;

      await tempService.sendToChannelMembers([user1], 'sender', 'Hello', 42);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should handle non-ok fetch response', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal error'),
      });
      global.fetch = fetchMock;

      // Should not throw, should log the error
      await expect(
        service.sendToChannelMembers([user1], 'sender', 'Hello', 42)
      ).resolves.not.toThrow();

      expect(fetchMock).toHaveBeenCalled();
    });

    it('should handle fetch connection failures', async () => {
      const fetchMock = jest.fn().mockRejectedValue(new Error('Connection timed out'));
      global.fetch = fetchMock;

      // Should not throw, should log error
      await expect(
        service.sendToChannelMembers([user1], 'sender', 'Hello', 42)
      ).resolves.not.toThrow();

      expect(fetchMock).toHaveBeenCalled();
    });
  });
});
