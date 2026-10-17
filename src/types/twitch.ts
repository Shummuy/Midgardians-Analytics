export type StreamingPlatform = 'twitch' | 'youtube';

export interface StreamRow {
  id: string;
  platform?: StreamingPlatform;
  rawDate: string;
  formattedDate: string;
  formattedTime: string;
  dateObj?: Date | string;
  timestamp: number;
  title: string;
  game: string;
  duration: string;
  durationMinutes: number;
  
  // The 4 requested metrics in order:
  views: number; // Views Totais (Visualizações ao Vivo)
  avgViewers: number; // Média de Views (Ao Vivo / Simultâneo)
  peakViewers: number; // Pico de Views (Ao Vivo / Simultâneo)
  uniqueChatters: number; // Participantes Únicos do Chat (Chat Único)
  
  // Secondary metrics if present in CSV:
  chatMessages?: number;
  newFollowers?: number;
  isEstimatedViews?: boolean;
  rawColumns?: Record<string, string>;
}

export interface CsvParseResult {
  platform?: StreamingPlatform;
  streams: StreamRow[];
  totalStreams: number;
  fileName?: string;
  headersDetected: string[];
  rawHeaders: string[];
  detectedViewsColumn?: string;
}
