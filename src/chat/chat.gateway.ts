import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	OnGatewayConnection,
	OnGatewayDisconnect,
	ConnectedSocket,
	MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { SocketData, JwtPayload } from '../common/types/express';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge } from 'prom-client';
import { Interval } from '@nestjs/schedule';

type AuthSocket = Socket<any, any, any, SocketData>;

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer() server: Server;

	constructor(
		private readonly jwtService: JwtService,
		@InjectMetric('ws_connections_active')
		private readonly wsGauge: Gauge<string>,
		@InjectMetric('ws_disconnects_total')
		private readonly wsDisconnects: Counter<string>,
	) {}

	async handleConnection(client: AuthSocket) {
		try {
			const auth = client.handshake.auth as Record<string, unknown>;
			const headers = client.handshake.headers;

			let token: string | undefined;

			if (typeof auth['token'] === 'string') {
				token = auth['token'];
			} else if (typeof headers['authorization'] === 'string') {
				token = headers['authorization'];
			}

			if (!token) {
				console.log('Disconnecting: No token');
				client.disconnect();
				return;
			}

			this.wsGauge.inc(); // increase websocket connexions counter for Prometheus

			const cleanToken = token.replace('Bearer ', '').trim();

			const payload = await this.jwtService.verifyAsync<JwtPayload>(cleanToken, {
				secret: process.env.JWT_SECRET || 'AT-SECRET',
			});

			client.data.user = payload;

			console.log(`WS Connected: ${payload.username} (${client.id})`);
		} catch {
			console.log('WS Auth Failed');
			client.disconnect();
		}
	}

	handleDisconnect(client: AuthSocket) {
		if (client.data.user) {
			console.log(`WS Disconnected: ${client.data.user.username}`);
			this.wsGauge.dec(); // decrease websocket connexions counter for Prometheus
			this.wsDisconnects.inc({ reason: 'client_closed' }); // add disconnect reason to Prometheus counter
		}
	}

	@SubscribeMessage('joinChannel')
	handleJoinChannel(@ConnectedSocket() client: AuthSocket, @MessageBody() channelId: number) {
		const roomName = `channel_${channelId}`;

		void client.join(roomName);

		console.log(`User ${client.data.user?.username} joined ${roomName}`);
		return { event: 'joined', message: `Joined channel ${channelId}` };
	}

	@SubscribeMessage('leaveChannel')
	handleLeaveChannel(@ConnectedSocket() client: AuthSocket, @MessageBody() channelId: number) {
		const roomName = `channel_${channelId}`;
		void client.leave(roomName);
		console.log(`User ${client.data.user?.username} left ${roomName}`);
	}

	@Interval(30_000)
	resyncGauge() {
		this.wsGauge.set(this.server?.sockets?.sockets?.size ?? 0);
	}
}
