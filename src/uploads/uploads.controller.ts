/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { JwtAuthGuard } from '@/auth/guard';
import type { MulterFile } from '@/types';
import {
	BadRequestException,
	Body,
	Controller,
	Post,
	Req,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { randomBytes, randomUUID } from 'crypto';
import type { Request } from 'express';
import { writeFile } from 'fs';
import path from 'path';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('protected/uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
	// @Post('/image')
	// @UseInterceptors(
	// 	FileInterceptor('file', {
	// 		limits: { fileSize: Math.pow(1024, 2) * 10 }, // limit image size to 10mb
	// 	}),
	// )
	// async uploadImage(@Req() req: Request, @UploadedFile() file: MulterFile) {
	// 	const protocol = req.protocol;
	// 	const host = req.get('host');
	// 	const baseUrl = `${protocol}://${host}`;

	// 	const filename = randomUUID().replaceAll('-', '');
	// 	console.log(filename);

	// 	const fileUrl = `${baseUrl}/uploads/${filename}`;
	// 	console.log(fileUrl);
	// 	return {
	// 		url: fileUrl,
	// 	};
	// }

	@Post('/image')
	async uploadImage(@Req() req: Request, @Body('file') base64String: string) {
		if (!base64String) {
			throw new BadRequestException('file payload is required');
		}

		// strip mime type prefix, extract raw base64
		const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
		const buffer = Buffer.from(base64Data, 'base64');

		// enforce size limit manually, 10mb maximum
		if (buffer.length > Math.pow(1024, 2) * 10) {
			throw new BadRequestException('file size exceeds 10mb limit');
		}

		const filename = `${randomUUID().replaceAll('-', '')}.jpg`;
		const uploadPath = path.join(process.cwd(), 'files', filename);

		// write binary buffer to disk
		writeFile(uploadPath, buffer, (err) => {
			if (err) throw err;
			console.log('The file has been saved!');
		});

		const protocol = req.protocol;
		const host = req.get('host');
		const baseUrl = `${protocol}://${host}`;

		return {
			url: `${baseUrl}/uploads/${filename}`,
		};
	}
}
