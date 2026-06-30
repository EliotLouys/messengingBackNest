/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AuthCredentialsDto } from '../common/dto/login.dto';
import { Device, Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
	constructor(private prisma: PrismaService) {}

	async findOne(username: string) {
		return this.prisma.user.findUnique({ where: { username } });
	}

	async create(dto: AuthCredentialsDto) {
		const salt = await bcrypt.genSalt();
		const hashedPassword = await bcrypt.hash(dto.password, salt);

		try {
			const user = await this.prisma.user.create({
				data: {
					username: dto.username,
					password: hashedPassword,
				},
			});

			// Automatically add the user to the "Général" channel (or fallback first channel) if it exists
			const generalChannel = await this.prisma.channel.findFirst({
				where: { name: { in: ['Général', 'General', 'general'] } },
			});
			if (generalChannel) {
				await this.prisma.channelMember.create({
					data: {
						userId: user.id,
						channelId: generalChannel.id,
						role: 'member',
					},
				});
			} else {
				const firstChannel = await this.prisma.channel.findFirst();
				if (firstChannel) {
					await this.prisma.channelMember.create({
						data: {
							userId: user.id,
							channelId: firstChannel.id,
							role: 'member',
						},
					});
				}
			}

			const { password, ...result } = user;
			return result;
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === 'P2002') throw new ConflictException('Ce pseudo est déjà pris');
			}
			throw error;
		}
	}

	async findOneById(id: number) {
		const user = await this.prisma.user.findUnique({
			where: { id },
		});
		if (!user) throw new NotFoundException('Utilisateur introuvable');

		const { password, hashedRefreshToken, ...result } = user;
		return result;
	}

	async update(id: number, data: { username?: string }) {
		try {
			const user = await this.prisma.user.update({
				where: { id },
				data: data,
			});
			const { password, hashedRefreshToken, ...result } = user;
			return result;
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === 'P2002') throw new ConflictException('Ce pseudo est déjà pris');
			}
			throw error;
		}
	}

	async findManyByUsernames(usernames: string[]) {
		const users = await this.prisma.user.findMany({
			where: {
				username: {
					in: usernames,
				},
			},
			// Exclude passwords and sensitive data from the result
			select: {
				username: true,
				display_name: true,
				img: true,
				status: true,
			},
		});
		return users;
	}

	async addDeviceToken(userId: number, token: string): Promise<Device> {
		const result = await this.prisma.device.upsert({
			where: { token: token },
			update: { userId: userId },
			create: {
				token: token,
				userId: userId,
			},
		});
		return result;
	}

	async removeDeviceToken(userId: number, token: string) {
		// deleteMany est plus sûr ici, il garantit qu'on ne supprime le token
		// QUE s'il appartient bien à l'utilisateur qui fait la requête.
		return await this.prisma.device.deleteMany({
			where: {
				token: token,
				userId: userId,
			},
		});
	}
}
