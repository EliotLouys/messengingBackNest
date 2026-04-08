/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { JwtAuthGuard } from '@/auth/guard';
import type { MulterFile } from '@/types';
import { Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('protected/uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
	@Post('/image')
	@UseInterceptors(
		FileInterceptor('file', {
			limits: { fileSize: Math.pow(1024, 2) * 10 }, // limit image size to 10mb
		}),
	)
	async uploadImage(@Req() req: Request, @UploadedFile() file: MulterFile) {
		const protocol = req.protocol;
    const host = req.get("host");
    const baseUrl = `${protocol}://${host}`;

		const fileUrl = `${baseUrl}/uploads/${file.filename}`;
		return {
			url: fileUrl,
		};
	}
}
