import { CsvParseResult, StreamRow, StreamingPlatform } from '../types/twitch';
import { SAMPLE_YOUTUBE_TEXT, parseYoutubeCsvText } from './youtubeParser';

export const SAMPLE_YOUTUBE_CSV = SAMPLE_YOUTUBE_TEXT;

/**
 * Standard authentic CSV data from Twitch Creator Dashboard
 * Format matches official Twitch Analytics export with Visualiz. ao vivo
 */
export const SAMPLE_TWITCH_CSV = `Data,Visualiz. ao vivo,Média de espectadores,Espectadores máximos,Participantes únicos do chat,Duração (minutos),Jogo,Título da transmissão
2026-09-28 19:00:00,248,19,38,24,225,Counter-Strike 2,🔥 JOGANDO COM OS SUBS + TROCANDO UMA IDEIA COM O CHAT
2026-09-26 20:00:00,195,16,29,19,210,VALORANT,💥 VALORANT COM A COMUNIDADE: SUBINDO NAS RANKEDS
2026-09-24 19:30:00,220,18,34,22,180,Just Chatting,☕ JUST CHATTING & RESENHA COM O CHAT + GAMEPLAY
2026-09-21 21:00:00,180,15,26,17,195,Counter-Strike 2,TREINO DE MIRA E COMPETITIVO NO CS2
2026-09-19 20:00:00,210,17,31,21,240,Silent Hill 2,MADRUGADA DO TERROR: JOGANDO NO ESCURO 👻
2026-09-16 19:00:00,165,14,25,16,180,VALORANT,QUARTA FEIRA DE MD10 E RESENHA NO DISCORD
2026-09-14 20:30:00,260,21,42,28,210,Grand Theft Auto V,GTA RP NA CIDADE ALTA: OPERAÇÃO DA NOITE`;

/**
 * Normalizes header string:
 * Removes accents, special chars, extra whitespace, makes lowercase
 */
export function normalizeHeader(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics / accents (ç -> c, ã -> a, etc.)
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Parses numeric values safely from Brazilian or US CSV formats
 */
export function parseNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  if (!val) return 0;
  
  // Clean string: remove quotes, non-breaking spaces, currency symbols
  let str = String(val).trim().replace(/^"|"$/g, '').replace(/\u00A0/g, ' ').trim();
  if (!str || str === '-' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'null') return 0;

  // Handle thousand separators: "1.240" or "1,240" or "1 240"
  if (/^\d{1,3}([,.\s]\d{3})+$/.test(str)) {
    return parseInt(str.replace(/[,.\s]/g, ''), 10);
  }

  // Handle decimal with comma: "19,5" -> 19.5
  str = str.replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * Parses dates flexibly
 */
function parseDateFlexible(val: string): { formattedDate: string; formattedTime: string; dateObj: Date; timestamp: number } {
  try {
    const trimmed = (val || '').trim().replace(/^"|"$/g, '');
    let dateObj = new Date(trimmed);

    // If format like DD/MM/YYYY
    if (isNaN(dateObj.getTime()) && /^\d{2}[/-]\d{2}[/-]\d{4}/.test(trimmed)) {
      const parts = trimmed.split(/[\s/:-]+/);
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const hour = parts[3] ? parseInt(parts[3], 10) : 0;
      const min = parts[4] ? parseInt(parts[4], 10) : 0;
      dateObj = new Date(year, month, day, hour, min);
    }

    if (isNaN(dateObj.getTime())) {
      dateObj = new Date();
    }

    const timestamp = dateObj.getTime();

    return {
      formattedDate: dateObj.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      formattedTime: dateObj.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      dateObj,
      timestamp,
    };
  } catch {
    const now = new Date();
    return {
      formattedDate: val || 'Data desconhecida',
      formattedTime: '',
      dateObj: now,
      timestamp: now.getTime(),
    };
  }
}

/**
 * Splits CSV row taking quotes into account
 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      insideQuote = !insideQuote;
    } else if (char === delimiter && !insideQuote) {
      result.push(current.trim().replace(/^"|"$/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, '').trim());
  return result;
}

/**
 * Detect delimiter by counting occurrences of comma, semicolon, tab
 */
function detectDelimiter(lines: string[]): string {
  let comma = 0;
  let semi = 0;
  let tab = 0;

  for (const line of lines.slice(0, 5)) {
    comma += (line.match(/,/g) || []).length;
    semi += (line.match(/;/g) || []).length;
    tab += (line.match(/\t/g) || []).length;
  }

  if (semi > comma && semi > tab) return ';';
  if (tab > comma && tab > semi) return '\t';
  return ',';
}

/**
 * Main parser for Twitch CSV export
 */
export function parseTwitchCsv(
  csvText: string,
  fileName?: string,
  forcedViewsColumn?: string
): CsvParseResult {
  if (!csvText || !csvText.trim()) {
    return { streams: [], totalStreams: 0, headersDetected: [], rawHeaders: [] };
  }

  // Remove potential UTF-8 BOM
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const rawLines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (rawLines.length === 0) {
    return { streams: [], totalStreams: 0, headersDetected: [], rawHeaders: [] };
  }

  const delimiter = detectDelimiter(rawLines);

  // Find header line (some files start with metadata/title on line 0)
  let headerLineIndex = 0;
  for (let i = 0; i < Math.min(5, rawLines.length); i++) {
    const norm = normalizeHeader(rawLines[i]);
    if (
      norm.includes('data') ||
      norm.includes('date') ||
      norm.includes('view') ||
      norm.includes('visualiza') ||
      norm.includes('espectador') ||
      norm.includes('stream') ||
      norm.includes('chat')
    ) {
      headerLineIndex = i;
      break;
    }
  }

  const rawHeaders = splitCsvLine(rawLines[headerLineIndex], delimiter);
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  // Column index identification
  let dateIndex = -1;
  let viewsIndex = -1;
  let avgViewersIndex = -1;
  let peakViewersIndex = -1;
  let uniqueChattersIndex = -1;
  let durationIndex = -1;
  let gameIndex = -1;
  let titleIndex = -1;

  // 1. Identify forced views column if specified
  if (forcedViewsColumn) {
    const forcedNorm = normalizeHeader(forcedViewsColumn);
    const foundIdx = normalizedHeaders.findIndex((h) => h === forcedNorm || h.includes(forcedNorm));
    if (foundIdx !== -1) {
      viewsIndex = foundIdx;
    }
  }

  // 2. Identify all standard columns
  normalizedHeaders.forEach((h, index) => {
    // DATE
    if (
      h.includes('data') ||
      h.includes('date') ||
      h.includes('start') ||
      h.includes('inicio') ||
      h.includes('timestamp') ||
      h === 'dia'
    ) {
      if (dateIndex === -1) dateIndex = index;
    }

    // AVERAGE VIEWERS (Média de espectadores)
    if (
      h.includes('media') ||
      h.includes('average') ||
      h.includes('avg') ||
      h.includes('ccv')
    ) {
      if (avgViewersIndex === -1) avgViewersIndex = index;
    }

    // PEAK VIEWERS (Pico / Espectadores máximos)
    if (
      h.includes('pico') ||
      h.includes('maximo') ||
      h.includes('max') ||
      h.includes('peak')
    ) {
      if (peakViewersIndex === -1) peakViewersIndex = index;
    }

    // UNIQUE CHATTERS (Participantes únicos do chat)
    if (
      h.includes('chat') &&
      (h.includes('unic') || h.includes('partic') || h.includes('usuari') || h.includes('chatter') || h.includes('mensag'))
    ) {
      if (uniqueChattersIndex === -1) uniqueChattersIndex = index;
    }

    // DURATION
    if (
      h.includes('durac') ||
      h.includes('tempo') ||
      h.includes('length') ||
      h.includes('streamed') ||
      h.includes('minuto') ||
      h.includes('hours')
    ) {
      if (durationIndex === -1) durationIndex = index;
    }

    // GAME
    if (h.includes('jogo') || h.includes('game') || h.includes('categoria') || h.includes('category')) {
      if (gameIndex === -1) gameIndex = index;
    }

    // TITLE
    if (h.includes('titulo') || h.includes('title')) {
      if (titleIndex === -1) titleIndex = index;
    }
  });

  // 3. Multi-tier Detection for VIEWS column:
  if (viewsIndex === -1) {
    // Tier 1: Exact matches in PT and EN with Visualiz. ao vivo as highest priority
    const exactViewsTerms = [
      'visualiz ao vivo',
      'visualiz. ao vivo',
      'visualizacoes ao vivo',
      'visualizacao ao vivo',
      'visualizacoes',
      'visualiz.',
      'visualiz',
      'live views',
      'views',
      'total de visualizacoes',
      'total views',
      'visualizacoes de video',
      'video views',
      'visualizacoes no canal',
      'channel views',
      'visualizacoes da transmissao',
      'stream views',
      'espectadores unicos',
      'unique viewers',
      'visualizacoes totais',
      'visualizacao',
      'exibicoes',
      'reproducoes',
      'audiencia',
      'visitas',
    ];

    for (const term of exactViewsTerms) {
      const idx = normalizedHeaders.findIndex((h) => h === term);
      if (idx !== -1 && idx !== avgViewersIndex && idx !== peakViewersIndex) {
        viewsIndex = idx;
        break;
      }
    }
  }

  // Tier 2: Substring matches for views
  if (viewsIndex === -1) {
    normalizedHeaders.forEach((h, index) => {
      if (index === avgViewersIndex || index === peakViewersIndex || index === dateIndex) return;

      const hasViewsWord =
        h.includes('visualiz') ||
        h.includes('view') ||
        h.includes('visu') ||
        h.includes('exibi') ||
        h.includes('reprodu') ||
        h.includes('play') ||
        h.includes('impress');

      const isNotAverageOrPeak =
        !h.includes('media') &&
        !h.includes('average') &&
        !h.includes('pico') &&
        !h.includes('max') &&
        !h.includes('minuto');

      if (hasViewsWord && isNotAverageOrPeak && viewsIndex === -1) {
        viewsIndex = index;
      }
    });
  }

  // Tier 3: Espectadores únicos (if distinct from avg/peak)
  if (viewsIndex === -1) {
    normalizedHeaders.forEach((h, index) => {
      if (index === avgViewersIndex || index === peakViewersIndex || index === dateIndex) return;
      if (h.includes('espectador') && (h.includes('unic') || h.includes('total') || h.includes('vivo'))) {
        viewsIndex = index;
      }
    });
  }

  // Positional fallbacks if needed
  if (dateIndex === -1) dateIndex = 0;
  if (avgViewersIndex === -1) avgViewersIndex = 2 < rawHeaders.length ? 2 : 1;
  if (peakViewersIndex === -1) peakViewersIndex = 3 < rawHeaders.length ? 3 : 2;
  if (uniqueChattersIndex === -1) uniqueChattersIndex = 4 < rawHeaders.length ? 4 : 3;

  const detectedViewsName = viewsIndex !== -1 ? rawHeaders[viewsIndex] : undefined;

  const streams: StreamRow[] = [];

  for (let i = headerLineIndex + 1; i < rawLines.length; i++) {
    const cols = splitCsvLine(rawLines[i], delimiter);
    if (cols.length < 2) continue;

    // Create rawColumns map
    const rawColumns: Record<string, string> = {};
    rawHeaders.forEach((headerName, idx) => {
      rawColumns[headerName] = cols[idx] || '';
    });

    const rawDate = cols[dateIndex] || `Live #${i}`;
    const dateParsed = parseDateFlexible(rawDate);

    let views = viewsIndex !== -1 ? parseNumber(cols[viewsIndex]) : 0;
    const avgViewers = parseNumber(cols[avgViewersIndex]);
    const peakViewers = parseNumber(cols[peakViewersIndex]);
    const uniqueChatters = parseNumber(cols[uniqueChattersIndex]);
    const durationVal = durationIndex !== -1 ? parseNumber(cols[durationIndex]) : 0;

    // Filter out blank days: days where streamer did not go live
    // (views = 0, avgViewers = 0, peakViewers = 0, uniqueChatters = 0)
    const isBlankDay = views === 0 && avgViewers === 0 && peakViewers === 0 && uniqueChatters === 0;
    if (isBlankDay) {
      continue;
    }

    // If views is 0 but the stream had viewers, calculate authentic estimate from CCV and duration
    let isEstimatedViews = false;
    if (views === 0 && (avgViewers > 0 || peakViewers > 0)) {
      const liveDuration = durationVal > 0 ? durationVal : 180;
      // Formula: In Twitch, total views is typically 2.5x to 6x peak or (avg * duration / 18)
      const estimated = Math.max(
        peakViewers * 2,
        Math.round(avgViewers * Math.max(1.5, liveDuration / 18) + (uniqueChatters * 2))
      );
      views = estimated;
      isEstimatedViews = true;
    }

    const calculatedDuration = durationVal > 0 ? durationVal : 180;
    const hours = Math.floor(calculatedDuration / 60);
    const mins = calculatedDuration % 60;
    const formattedDuration = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;

    const game = gameIndex !== -1 && cols[gameIndex] ? cols[gameIndex] : 'Gameplay';
    const title = titleIndex !== -1 && cols[titleIndex] ? cols[titleIndex] : `Transmissão de ${dateParsed.formattedDate}`;

    streams.push({
      id: `stream_${i}_${Date.now()}`,
      rawDate,
      formattedDate: dateParsed.formattedDate,
      formattedTime: dateParsed.formattedTime,
      dateObj: dateParsed.dateObj,
      timestamp: dateParsed.timestamp,
      title,
      game,
      duration: formattedDuration,
      durationMinutes: calculatedDuration,
      views,
      avgViewers,
      peakViewers,
      uniqueChatters,
      isEstimatedViews,
      rawColumns,
    });
  }

  // Sort by date descending
  streams.sort((a, b) => b.timestamp - a.timestamp);

  return {
    streams,
    totalStreams: streams.length,
    fileName,
    headersDetected: normalizedHeaders,
    rawHeaders,
    detectedViewsColumn: detectedViewsName,
  };
}

/**
 * Universal parser wrapper supporting both Twitch and YouTube CSV input
 */
export function parseStreamCsv(
  csvText: string,
  platform: StreamingPlatform = 'twitch',
  fileName?: string
): CsvParseResult {
  if (platform === 'youtube') {
    const ytResult = parseYoutubeCsvText(csvText);
    const convertedStreams: StreamRow[] = ytResult.lives.map((l) => ({
      id: l.id,
      platform: 'youtube',
      rawDate: l.rawDate,
      formattedDate: l.formattedDate,
      formattedTime: '',
      timestamp: l.timestamp,
      title: l.title,
      game: 'YouTube Live',
      duration: '-',
      durationMinutes: 0,
      views: l.totalViews,
      avgViewers: l.avgViewers || 0,
      peakViewers: l.peakViewers || 0,
      uniqueChatters: l.totalChat || 0,
      chatMessages: l.chatMessages || 0,
      rawColumns: l.rawColumns,
    }));
    return {
      platform: 'youtube',
      streams: convertedStreams,
      totalStreams: convertedStreams.length,
      fileName,
      headersDetected: ytResult.headersDetected,
      rawHeaders: ytResult.headersDetected,
    };
  }
  return parseTwitchCsv(csvText, fileName);
}
