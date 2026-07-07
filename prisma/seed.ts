import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Seeding en cours : 4 Users, 1 Public, 2 Privés...');

	// Database cleanup
	await prisma.message.deleteMany();
	await prisma.channelMember.deleteMany();
	await prisma.channel.deleteMany();
	await prisma.user.deleteMany();

	// Create basic auth password
	const salt = await bcrypt.genSalt();
	const hashed = await bcrypt.hash('123456', salt);

	// Create 4 users
	const users = await Promise.all([
		prisma.user.create({
			data: {
				username: 'Alice',
				password: hashed,
				display_name: 'Alice M.',
				img: 'https://www.neozone.org/blog/wp-content/uploads/2021/04/chat-espion-002.jpg',
			},
		}),
		prisma.user.create({
			data: {
				username: 'Bob',
				password: hashed,
				display_name: 'Bob B.',
				img: 'https://ziggyfamily.com/cdn/shop/files/chat-espionne-sous-la-douche_1000x.png?v=1745423604',
			},
		}),
		prisma.user.create({
			data: {
				username: 'Charlie',
				password: hashed,
				display_name: 'Charlie C.',
				img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRewheEYrkp1CREHY2zen3pFgDIwWSfIs9PQ&s',
			},
		}),
		prisma.user.create({
			data: {
				username: 'Dave',
				password: hashed,
				display_name: 'Dave L.',
				img: 'https://www.filalapat.fr/sites/default/files/inline-images/AdobeStock_282605628%20%281%29.jpeg',
			},
		}),
	]);
	const [u1, u2, u3, u4] = users;

	// Color themes
	const themeBlue = JSON.stringify({
		primary_color: '#0000FF',
		primary_color_dark: '#00008B',
		accent_color: '#ADD8E6',
		text_color: '#FFFFFF',
		accent_text_color: '#000000',
	});
	const themeRed = JSON.stringify({
		primary_color: '#FF0000',
		primary_color_dark: '#8B0000',
		accent_color: '#d3818f',
		text_color: '#FFFFFF',
		accent_text_color: '#000000',
	});

	// "Général" Channel (everyone has access)
	const general = await prisma.channel.create({
		data: {
			name: 'Général',
			theme: themeBlue,
			creatorId: u1.id,
			img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTx989qGSM5yqAnCqZsiCL9G5GJHvpHTa1c-A&s',
			members: {
				create: [{ userId: u1.id, role: 'admin' }, { userId: u2.id }, { userId: u3.id }, { userId: u4.id }],
			},
		},
	});

	// "Staff Only" channel (Alice & Bob)
	const private1 = await prisma.channel.create({
		data: {
			name: '🔒 Staff Only',
			theme: themeRed,
			creatorId: u1.id,
			img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4MNFjbPk4Bygq5x2L3req-Eh2A6YDPIeDXQ&s',
			members: {
				create: [
					{ userId: u1.id, role: 'admin' },
					{ userId: u2.id, role: 'member' },
				],
			},
		},
	});

	// "Dev Secrets" channel (Charlie & Dave)
	const private2 = await prisma.channel.create({
		data: {
			name: '🔒 Dev Secrets',
			theme: themeRed,
			creatorId: u3.id,
			img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRcOztxtx1a7bYv6QaTd_kY4zHCQJ4Umbq9fg&s',
			members: {
				create: [
					{ userId: u3.id, role: 'admin' },
					{ userId: u4.id, role: 'member' },
				],
			},
		},
	});

	// Messages
	await prisma.message.createMany({
		data: [
			{ content: 'Salut tout le monde !', type: 'Text', authorId: u4.id, channelId: general.id },
			{ content: 'YO', type: 'Text', authorId: u3.id, channelId: general.id },
			{ content: 'Je vous déteste.', type: 'Text', authorId: u2.id, channelId: general.id },
			{ content: 'Qui pour un café ?', type: 'Text', authorId: u1.id, channelId: general.id },
			{ content: 'On est seuls Bob ?', type: 'Text', authorId: u1.id, channelId: private1.id },
			{ content: 'Ouais, Charlie et Dave voient rien.', type: 'Text', authorId: u2.id, channelId: private1.id },
			{ content: 'Le déploiement avance ?', type: 'Text', authorId: u3.id, channelId: private2.id },
			{ content: 'Non je veux me flinguer !', type: 'Text', authorId: u4.id, channelId: private2.id },
		],
	});

	console.log('✅ Base de données prête.');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
