import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

@Controller()
export class AppController {
	@Get()
	@ApiOperation({ summary: "Ping de l'API à sa racine" })
	getHello(): string {
		return 'Hello World!';
	}
}
