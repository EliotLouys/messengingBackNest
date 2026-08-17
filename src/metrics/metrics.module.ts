import { Module } from '@nestjs/common';
import {
	PrometheusModule,
	makeHistogramProvider,
	makeCounterProvider,
	makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';

// Providers are declared as exportable consts to be used for counters elsewhere in the API
const metricProviders = [
	makeHistogramProvider({
		name: 'http_request_duration_seconds',
		help: 'Durée des requêtes HTTP',
		labelNames: ['method', 'route', 'status'],
		buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
	}),
	makeGaugeProvider({
		name: 'ws_connections_active',
		help: 'Sockets connectées',
	}),
	makeCounterProvider({
		name: 'ws_disconnects_total',
		help: 'Déconnexions WebSocket',
		labelNames: ['reason'],
	}),
	makeCounterProvider({
		name: 'messages_published_total',
		help: 'Messages publiés',
		labelNames: ['type'],
	}),
	makeHistogramProvider({
		name: 'upload_size_bytes',
		help: 'Taille des images décodées',
		buckets: [50_000, 250_000, 1e6, 5e6, 10e6],
	}),
];

@Module({
	imports: [
		PrometheusModule.register({
			path: '/metrics',
			defaultMetrics: { enabled: true },
			defaultLabels: { service: 'messaging-api' },
		}),
	],
	providers: [...metricProviders],
	exports: [...metricProviders],
})
export class MetricsModule {}
