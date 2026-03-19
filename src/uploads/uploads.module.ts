import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { extname, join } from 'path';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

const uploadDir = join(process.cwd(), 'files');
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

@Module({
	imports: [
		MulterModule.register({
			storage: diskStorage({
				// specifies the storage destination and file name
				destination: (req, file, cb) => {
					cb(null, uploadDir);
				},
				filename: (req, file, cb) => {
					// TODO : add username from request to file name
					const ext = extname(file.originalname);
					const filename = `${Date.now()}${ext}`;
					cb(null, filename);
				},
			}),
			fileFilter: (req, file, cb) => {
				// filters file types
				if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
					cb(null, true);
				} else {
					cb(new Error('Only images are allowed...'), false);
				}
			},
		}),
	],
	controllers: [UploadsController],
	providers: [],
})
export class UploadsModule {}
