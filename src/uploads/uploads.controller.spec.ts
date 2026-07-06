import { Test, TestingModule } from '@nestjs/testing';
import { UploadsController } from './uploads.controller';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';

jest.mock('fs', () => ({
  writeFile: jest.fn((path, data, callback) => callback(null)),
}));

describe('UploadsController', () => {
  let controller: UploadsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
    }).compile();

    controller = module.get<UploadsController>(UploadsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadImage', () => {
    it('should throw BadRequestException if no base64 string provided', async () => {
      const req = { protocol: 'http', get: jest.fn().mockReturnValue('localhost:3000') } as any;
      await expect(controller.uploadImage(req, '')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file exceeds 10mb limit', async () => {
      const req = { protocol: 'http', get: jest.fn().mockReturnValue('localhost:3000') } as any;
      // 11mb of 'A' (base64 character is 3/4 bytes, so a very long string works)
      const base64String = 'data:image/jpeg;base64,' + 'A'.repeat(15 * 1024 * 1024);
      await expect(controller.uploadImage(req, base64String)).rejects.toThrow(BadRequestException);
    });

    it('should upload image and return url', async () => {
      const req = { protocol: 'http', get: jest.fn().mockReturnValue('localhost:3000') } as any;
      const base64String = 'data:image/jpeg;base64,c29tZSBpbWFnZSBkYXRh'; // base64 for 'some image data'
      const mockWriteFile = fs.writeFile as unknown as jest.Mock;

      const result = await controller.uploadImage(req, base64String);

      expect(mockWriteFile).toHaveBeenCalled();
      expect(result.url).toContain('http://localhost:3000/uploads/');
      expect(result.url).toContain('.jpg');
    });
  });
});
