/* eslint-disable @typescript-eslint/require-await */

import { JwtAuthGuard } from '@/auth/guard';
import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { writeFile } from 'fs';
import path from 'path';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('protected/uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
	@Post('/image')
	@ApiOperation({ summary: 'Uploader une image' })
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
