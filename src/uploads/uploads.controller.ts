/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { MulterFile } from '@/types';
import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('uploads')
export class UploadsController {
	@Post('/image')
	@UseInterceptors(
		FileInterceptor('file', {
			limits: { fileSize: Math.pow(1024, 2) * 10 }, // limit image size to 10mb
		}),
	)
	async uploadImage(@UploadedFile() file: MulterFile) {
		const fileUrl = `http://localhost:3000/uploads/${file.filename}`;
		return {
			url: fileUrl,
		};
	}
}
