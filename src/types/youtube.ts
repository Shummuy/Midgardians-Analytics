export interface YoutubeLiveRow {
  id: string;
  title: string;
  rawDate: string;
  formattedDate: string;
  timestamp: number;
  totalViews: number;
  avgViewers: number | null; // null if "Em processamento"
  peakViewers: number | null; // null if "Em processamento"
  chatMessages: number | null; // Mensagens no chat
  liveReactions: number | null; // Reações ao vivo
  totalChat: number | null; // Chat consolidado (inclui Mensagens + Reações)
  isProcessing: boolean;
  rawColumns?: Record<string, string>;
}

export interface YoutubeParseResult {
  lives: YoutubeLiveRow[];
  totalLives: number;
  headersDetected: string[];
}
