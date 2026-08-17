import { Test, TestingModule } from '@nestjs/testing';
import { getToken } from '@willsoto/nestjs-prometheus';
import { ChatGateway } from './chat.gateway';
import { JwtService } from '@nestjs/jwt';

describe('ChatGateway', () => {
	let gateway: ChatGateway;

	const mockJwtService = {
		verifyAsync: jest.fn(),
	};

	const mockWsGauge = {
		inc: jest.fn(),
		dec: jest.fn(),
		set: jest.fn(),
	};

	const mockWsDisconnects = {
		inc: jest.fn(),
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
				{ provide: getToken('ws_connections_active'), useValue: mockWsGauge },
				{ provide: getToken('ws_disconnects_total'), useValue: mockWsDisconnects },
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
			expect(mockWsGauge.inc).toHaveBeenCalledTimes(1);
		});

		it('should not increment the active connections gauge without a token', async () => {
			const client = mockSocket({}, {});

			await gateway.handleConnection(client);

			expect(mockWsGauge.inc).not.toHaveBeenCalled();
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

		it('should update the metrics if user exists', () => {
			const client = mockSocket();
			client.data.user = { username: 'testuser' };

			jest.spyOn(console, 'log').mockImplementation();
			gateway.handleDisconnect(client);

			expect(mockWsGauge.dec).toHaveBeenCalledTimes(1);
			expect(mockWsDisconnects.inc).toHaveBeenCalledWith({ reason: 'client_closed' });
		});

		it('should do nothing if user data is missing', () => {
			const client = mockSocket();
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
			gateway.handleDisconnect(client);
			expect(consoleSpy).not.toHaveBeenCalled();
			expect(mockWsGauge.dec).not.toHaveBeenCalled();
			expect(mockWsDisconnects.inc).not.toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});

	describe('resyncGauge', () => {
		it('should set the gauge to the current socket count', () => {
			gateway.server = {
				sockets: {
					sockets: new Map([
						['a', {}],
						['b', {}],
					]),
				},
			} as any;

			gateway.resyncGauge();

			expect(mockWsGauge.set).toHaveBeenCalledWith(2);
		});

		it('should set the gauge to 0 when the server is not ready', () => {
			gateway.server = undefined as any;

			gateway.resyncGauge();

			expect(mockWsGauge.set).toHaveBeenCalledWith(0);
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
