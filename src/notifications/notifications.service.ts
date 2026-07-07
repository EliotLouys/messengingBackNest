import { Injectable, Logger } from '@nestjs/common';
import { User, Device } from '@prisma/client';
import { ExpoPushMessage } from 'expo-server-sdk';

type UserWithDevices = User & { devices: Device[] };

@Injectable()
export class NotificationsService {
	private readonly logger = new Logger(NotificationsService.name);

	// Notifications relay environment variables
	private readonly relayUrl = process.env.RELAY_URL || 'http://localhost:4000/push';
	private readonly relaySecret = process.env.RELAY_SECRET;

	async sendToChannelMembers(recipients: UserWithDevices[], authorName: string, content: string, channelId: number) {
		const messages: ExpoPushMessage[] = [];

		for (const user of recipients) {
			if (!user.notificationsEnabled || !user.devices.length) continue;

			for (const device of user.devices) {
				if (!device.token || !device.token.startsWith('ExponentPushToken[')) continue;

				messages.push({
					to: device.token,
					sound: 'default',
					title: `Nouveau message de ${authorName}`,
					body: content,
					data: { channel_id: channelId },
					priority: 'high',
					channelId: 'high_priority_messages',
				});
			}
		}

		if (messages.length === 0) return;

		if (!this.relaySecret) {
			this.logger.warn('RELAY_SECRET manquant, notifications push annulées.');
			return;
		}

		try {
			// Send messages to the notifications service
			const response = await fetch(this.relayUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.relaySecret}`,
				},
				body: JSON.stringify(messages),
			});

			if (!response.ok) {
				this.logger.error(`Erreur du Relais Push: ${response.status} ${await response.text()}`);
			}
		} catch (error) {
			this.logger.error('Impossible de joindre le Relais Push:', error);
		}
	}
}
