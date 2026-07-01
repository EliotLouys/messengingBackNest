import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelDto, MessageDto } from '../common/dto/channel.dto';
import { Prisma } from '@prisma/client';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
@Injectable()
export class ChannelsService {
	constructor(
		private prisma: PrismaService,
		private chatGateway: ChatGateway,
		private notificationsService: NotificationsService,
	) {}

	async findChannels(userId: number) {
		const channels = await this.prisma.channel.findMany({
			where: {
				members: {
					some: {
						userId: userId,
					},
				},
			},
			include: {
				members: {
					select: {
						joinedAt: false,
						role: true,
						user: {
							select: {
								id: false,
								username: true,
							},
						},
					},
				},
			},
		});
		return channels.map((channel) => ({
			...channel,
			theme: channel.theme ? (JSON.parse(channel.theme) as ChannelDto) : null,
		}));
	}

	async findOne(channelId: number) {
		const channel = await this.prisma.channel.findUnique({
			where: { id: channelId },
			include: {
				members: {
					include: {
						user: { select: { id: true, username: true } },
					},
				},
			},
		});

		if (!channel) throw new NotFoundException('Channel not found');

		return {
			...channel,
			theme: channel.theme ? (JSON.parse(channel.theme) as ChannelDto) : null,
		};
	}

	async create(dto: ChannelDto, creatorId: number) {
		const { theme, ...rest } = dto;
		const themeJson = theme ? JSON.stringify(theme) : null;

		try {
			return await this.prisma.channel.create({
				data: {
					...rest,
					theme: themeJson,
					creatorId: creatorId,
					members: {
						create: { userId: creatorId, role: 'admin' },
					},
				},
			});
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === 'P2002') {
					throw new ConflictException('Ce nom de channel est déjà pris');
				}
			}
			throw error;
		}
	}

	async delete(channelId: number) {
		try {
			return await this.prisma.channel.delete({
				where: { id: channelId },
			});
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === 'P2025') {
					throw new NotFoundException(`Le channel #${channelId} n'existe pas`);
				}
			}
			throw error;
		}
	}

	async updateMetadata(dto: ChannelDto, channelId: number) {
		// <-- Changed from ThemeDto to ChannelDto
		try {
			// Stringify the theme if it exists, otherwise keep it null
			const themeJson = dto.theme ? JSON.stringify(dto.theme) : undefined;

			return await this.prisma.channel.update({
				where: { id: channelId },
				data: {
					name: dto.name,
					img: dto.img,
					...(themeJson !== undefined && { theme: themeJson }), // Only update theme if it was provided
				},
			});
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === 'P2025') {
					throw new NotFoundException(`Le channel n'existe pas`);
				}
				if (error.code === 'P2002') {
					throw new ConflictException('Ce nom de channel est déjà pris');
				}
			}
			throw error;
		}
	}
	async putInChannel(channelId: number, userId: number) {
		try {
			return await this.prisma.channelMember.create({
				data: {
					userId: userId,
					channelId: channelId,
				},
			});
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === 'P2002') {
					throw new ConflictException("L'utilisateur est déjà dans le channel");
				}
				if (error.code === 'P2003') {
					throw new NotFoundException(`Channel ou User introuvable`);
				}
			}
			throw error;
		}
	}

	async removeFromChannel(channelId: number, userId: number) {
		const result = await this.prisma.channelMember.deleteMany({
			where: {
				channelId: channelId,
				userId: userId,
			},
		});

		if (result.count === 0) {
			throw new NotFoundException(`L'utilisateur n'était pas dans ce channel`);
		}
		return { success: true };
	}

	async sendMessage(dto: MessageDto, channelId: number, authorId: number) {
		const newMessage = await this.prisma.message.create({
			data: {
				content: dto.content,
				type: dto.type || 'Text',
				channelId: channelId,
				authorId: authorId,
			},
			include: {
				author: {
					select: { id: true, username: true },
				},
			},
		});

		this.chatGateway.server.to(`channel_${channelId}`).emit('message', newMessage);

		const channelData = await this.prisma.channel.findUnique({
			where: { id: channelId },
			include: {
				members: {
					where: { userId: { not: authorId } },
					include: {
						user: {
							include: { devices: true }, // Nécessite la relation Device dans Prisma
						},
					},
				},
			},
		});

		if (channelData && channelData.members.length > 0) {
			const recipients = channelData.members.map((m) => m.user);

			this.notificationsService
				.sendToChannelMembers(recipients, newMessage.author.username, dto.content, channelId)
				.catch((e) => console.error('Erreur background notifications:', e));
		}
		// ---------------------------------------------------------

		return newMessage;
	}

	async getMessages(channelId: number) {
		const channelExists = await this.prisma.channel.findUnique({
			where: { id: channelId },
		});
		if (!channelExists) throw new NotFoundException('Channel introuvable');

		return await this.prisma.message.findMany({
			where: { channelId: channelId },
			orderBy: { createdAt: 'asc' },
			include: {
				author: {
					select: { id: true, username: true },
				},
			},
		});
	}
}
