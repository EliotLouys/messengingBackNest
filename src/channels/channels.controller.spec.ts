import { Test, TestingModule } from '@nestjs/testing';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';

describe('ChannelsController', () => {
  let controller: ChannelsController;

  const mockChannelsService = {
    findChannels: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    updateMetadata: jest.fn(),
    putInChannel: jest.fn(),
    removeFromChannel: jest.fn(),
    sendMessage: jest.fn(),
    getMessages: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChannelsController],
      providers: [{ provide: ChannelsService, useValue: mockChannelsService }],
    }).compile();

    controller = module.get<ChannelsController>(ChannelsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findChannels', () => {
    it('should find channels for the requesting user', async () => {
      const mockResult = [{ id: 1, name: 'General' }];
      mockChannelsService.findChannels.mockResolvedValue(mockResult);
      const req = { user: { id: 42 } } as any;

      const result = await controller.findChannels(req);
      expect(mockChannelsService.findChannels).toHaveBeenCalledWith(42);
      expect(result).toBe(mockResult);
    });
  });

  describe('findOne', () => {
    it('should find one channel by ID', async () => {
      const mockResult = { id: 1, name: 'General' };
      mockChannelsService.findOne.mockResolvedValue(mockResult);

      const result = await controller.findOne(1);
      expect(mockChannelsService.findOne).toHaveBeenCalledWith(1);
      expect(result).toBe(mockResult);
    });
  });

  describe('create', () => {
    it('should create a channel', async () => {
      const dto = { name: 'Ch1' };
      const req = { user: { id: 42 } } as any;
      const mockResult = { id: 1, name: 'Ch1' };
      mockChannelsService.create.mockResolvedValue(mockResult);

      const result = await controller.create(dto, req);
      expect(mockChannelsService.create).toHaveBeenCalledWith(dto, 42);
      expect(result).toBe(mockResult);
    });
  });

  describe('deleteChannel', () => {
    it('should delete a channel', async () => {
      mockChannelsService.delete.mockResolvedValue({ id: 1 });

      const result = await controller.deleteChannel(1);
      expect(mockChannelsService.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('updateMetadata', () => {
    it('should update channel metadata', async () => {
      const dto = { name: 'NewName' };
      const mockResult = { id: 1, name: 'NewName' };
      mockChannelsService.updateMetadata.mockResolvedValue(mockResult);

      const result = await controller.updateMetadata(dto, 1);
      expect(mockChannelsService.updateMetadata).toHaveBeenCalledWith(dto, 1);
      expect(result).toBe(mockResult);
    });
  });

  describe('joinChannel', () => {
    it('should put a user in a channel', async () => {
      const mockResult = { userId: 2, channelId: 1 };
      mockChannelsService.putInChannel.mockResolvedValue(mockResult);

      const result = await controller.joinChannel(1, 2);
      expect(mockChannelsService.putInChannel).toHaveBeenCalledWith(1, 2);
      expect(result).toBe(mockResult);
    });
  });

  describe('leaveChannel', () => {
    it('should remove a user from a channel', async () => {
      mockChannelsService.removeFromChannel.mockResolvedValue({ success: true });

      const result = await controller.leaveChannel(1, 2);
      expect(mockChannelsService.removeFromChannel).toHaveBeenCalledWith(1, 2);
      expect(result).toEqual({ success: true });
    });
  });

  describe('sendMessage', () => {
    it('should send a message to a channel', async () => {
      const dto = { content: 'hello' };
      const req = { user: { id: 42 } } as any;
      const mockResult = { id: 10, content: 'hello' };
      mockChannelsService.sendMessage.mockResolvedValue(mockResult);

      const result = await controller.sendMessage(dto, 1, req);
      expect(mockChannelsService.sendMessage).toHaveBeenCalledWith(dto, 1, 42);
      expect(result).toBe(mockResult);
    });
  });

  describe('getMessages', () => {
    it('should retrieve message history', async () => {
      const mockResult = [{ id: 10, content: 'hello' }];
      mockChannelsService.getMessages.mockResolvedValue(mockResult);

      const result = await controller.getMessages(1, '10', '20');
      expect(mockChannelsService.getMessages).toHaveBeenCalledWith(1, 10, 20);
      expect(result).toBe(mockResult);
    });

    it('should handle undefined skip/take parameters', async () => {
      const mockResult = [{ id: 10, content: 'hello' }];
      mockChannelsService.getMessages.mockResolvedValue(mockResult);

      const result = await controller.getMessages(1, undefined, undefined);
      expect(mockChannelsService.getMessages).toHaveBeenCalledWith(1, undefined, undefined);
      expect(result).toBe(mockResult);
    });
  });
});
