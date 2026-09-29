import { YoutubeLiveRow, YoutubeParseResult } from '../types/youtube';

export const SAMPLE_YOUTUBE_TEXT = `Título da Live,Data de Publicação,Visualizações Totais,Média de Espectadores Simultâneos,Pico de Espectadores Simultâneos,Mensagens no Chat,Reações ao Vivo
"Ragnarok LATAM - MANUTENÇÃO 01/09",2026-09-01,4676,239,315,792,2
"UP COM O CHAT! #ragnarokonline",2026-09-08,1956,49,86,363,2
"ROS LATAM 2026: Main Event - Fase de Grupos - Dia 1",2026-09-12,1050,38,54,77,5
"ROS LATAM 2026: Main Event - Fase de Grupos - Dia 2",2026-09-13,1182,35,53,99,0
"ROS LATAM 2026: Main Event - Playoffs e Grande Final",2026-09-14,1142,29,50,85,0
"Ragnarok LATAM - MANUTENÇÃO 15/09",2026-09-15,6350,230,300,976,4
"ME RENDEREI AO META! #ragnarokonline",2026-09-18,5185,108,149,1057,13
"PROJETO BETEL TA SAINDO!! #ragnarokonline",2026-09-23,2818,57,73,587,3
"QUEM É QUE PRECISA DE 2X?! #ragnarokonline",2026-09-24,3743,97,144,873,22
"EM BUSCA DO 240! #ragnarokonline",2026-09-26,2573,79,108,330,0
"O RESULTADO DO ""PROJETO BETEL""! #ragnarokonline",2026-09-29,3117,Em processamento,Em processamento,Em processamento,Em processamento`;

/**
 * Normalizes header string
 */
function normalizeHeader(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Parses numeric value or returns null if "Em processamento" / empty
 */
function parseYoutubeNumber(val: any): { value: number | null; isProcessing: boolean } {
  if (typeof val === 'number') return { value: isNaN(val) ? 0 : Math.round(val), isProcessing: false };
  if (!val && val !== 0) return { value: null, isProcessing: false };

  let str = String(val).trim();
  // Strip outer quotes if any
  str = str.replace(/^["']|["']$/g, '').trim();
  const lower = str.toLowerCase();

  if (lower.includes('process') || lower.includes('pendent') || lower.includes('calculando')) {
    return { value: null, isProcessing: true };
  }

  if (str === '-' || lower === 'n/a' || lower === 'null' || str === '') {
    return { value: null, isProcessing: false };
  }

  // Handle thousand separators: "4,676" or "4.676"
  if (/^\d{1,3}([,.\s]\d{3})+$/.test(str)) {
    return { value: parseInt(str.replace(/[,.\s]/g, ''), 10), isProcessing: false };
  }

  const clean = str.replace(',', '.');
  const num = parseFloat(clean);
  return { value: isNaN(num) ? 0 : Math.round(num), isProcessing: false };
}

/**
 * Parses CSV lines robustly, handling escaped quotes ("") and stray surrounding quotes
 */
function parseCsvRow(rawLine: string, delimiter: string): string[] {
  let line = rawLine.trim();

  // Fix common paste issue: if line starts with a stray single quote before unquoted text
  // e.g. `"Título da Live,Data de Publicação...` without closing quote before comma
  if (line.startsWith('"') && !line.startsWith('""')) {
    const firstDelimiter = line.indexOf(delimiter);
    const firstClosingQuote = line.indexOf('"' + delimiter);
    // If there is no closing quote before the first delimiter, strip the stray leading quote
    if (firstDelimiter !== -1 && (firstClosingQuote === -1 || firstClosingQuote > firstDelimiter)) {
      line = line.substring(1);
    }
  }

  // Fix stray trailing quote on the last line e.g. `...,Em processamento"`
  if (line.endsWith('"') && !line.endsWith('""')) {
    const lastDelimiter = line.lastIndexOf(delimiter);
    const lastOpeningQuote = line.lastIndexOf(delimiter + '"');
    if (lastDelimiter !== -1 && (lastOpeningQuote === -1 || lastOpeningQuote < lastDelimiter)) {
      line = line.substring(0, line.length - 1);
    }
  }

  const cols: string[] = [];
  let current = '';
  let insideQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === delimiter && !insideQuote) {
      cols.push(current.trim().replace(/^"|"$/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }
  cols.push(current.trim().replace(/^"|"$/g, '').trim());

  return cols;
}

/**
 * Parses YouTube date format (e.g. "2026-09-01" or "01/09/2026")
 */
function parseYoutubeDate(val: string): { formattedDate: string; timestamp: number } {
  try {
    const trimmed = (val || '').trim().replace(/^"|"$/g, '');
    let dateObj = new Date(trimmed);

    // If YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parts = trimmed.split(/[-T\s]+/);
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      dateObj = new Date(year, month, day, 12, 0, 0);
    } else if (/^\d{2}[/-]\d{2}[/-]\d{4}/.test(trimmed)) {
      const parts = trimmed.split(/[/:-]+/);
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      dateObj = new Date(year, month, day, 12, 0, 0);
    }

    if (isNaN(dateObj.getTime())) {
      dateObj = new Date();
    }

    return {
      formattedDate: dateObj.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      timestamp: dateObj.getTime(),
    };
  } catch {
    const now = new Date();
    return {
      formattedDate: val || 'Data desconhecida',
      timestamp: now.getTime(),
    };
  }
}

/**
 * Detect delimiter
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

  if (tab > comma && tab > semi) return '\t';
  if (semi > comma && semi > tab) return ';';
  return ',';
}

/**
 * Parses YouTube CSV Text
 */
export function parseYoutubeCsvText(csvText: string): YoutubeParseResult {
  if (!csvText || !csvText.trim()) {
    return { lives: [], totalLives: 0, headersDetected: [] };
  }

  let cleanText = csvText.trim().replace(/^\uFEFF/, '');

  // Strip whole-document quotes if the entire text was wrapped in `" ... "`
  if (cleanText.startsWith('"') && cleanText.endsWith('"')) {
    const firstNewline = cleanText.indexOf('\n');
    const firstComma = cleanText.indexOf(',');
    const firstClosing = cleanText.indexOf('",');
    if (firstClosing === -1 || (firstNewline !== -1 && firstClosing > firstNewline)) {
      cleanText = cleanText.substring(1, cleanText.length - 1).trim();
    }
  }

  const rawLines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (rawLines.length === 0) {
    return { lives: [], totalLives: 0, headersDetected: [] };
  }

  const delimiter = detectDelimiter(rawLines);

  // Identify header row
  let headerIndex = 0;
  for (let i = 0; i < Math.min(5, rawLines.length); i++) {
    const norm = normalizeHeader(rawLines[i]);
    if (
      norm.includes('titulo') ||
      norm.includes('title') ||
      norm.includes('data') ||
      norm.includes('visualizac') ||
      norm.includes('espectador') ||
      norm.includes('chat')
    ) {
      headerIndex = i;
      break;
    }
  }

  const rawHeaders = parseCsvRow(rawLines[headerIndex], delimiter);
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  let titleIdx = -1;
  let dateIdx = -1;
  let viewsIdx = -1;
  let avgIdx = -1;
  let peakIdx = -1;
  let chatIdx = -1;
  let reactionsIdx = -1;

  normalizedHeaders.forEach((h, idx) => {
    if (h.includes('titulo') || h.includes('title') || h === 'live') {
      if (titleIdx === -1) titleIdx = idx;
    }
    if (h.includes('data') || h.includes('date') || h.includes('publicac')) {
      if (dateIdx === -1) dateIdx = idx;
    }
    if (
      (h.includes('visualizac') || h.includes('views') || h.includes('view')) &&
      !h.includes('media') &&
      !h.includes('pico')
    ) {
      if (viewsIdx === -1) viewsIdx = idx;
    }
    if (h.includes('media') || h.includes('average') || h.includes('avg')) {
      if (avgIdx === -1) avgIdx = idx;
    }
    if (h.includes('pico') || h.includes('peak') || h.includes('maximo') || h.includes('max')) {
      if (peakIdx === -1) peakIdx = idx;
    }
    if (h.includes('chat') || h.includes('mensag')) {
      if (chatIdx === -1) chatIdx = idx;
    }
    if (h.includes('reac') || h.includes('reaction') || h.includes('like') || h.includes('gostei')) {
      if (reactionsIdx === -1) reactionsIdx = idx;
    }
  });

  // Fallbacks:
  // 0: Título, 1: Data, 2: Visualizações, 3: Média, 4: Pico, 5: Chat, 6: Reações
  if (titleIdx === -1) titleIdx = 0;
  if (dateIdx === -1) dateIdx = 1;
  if (viewsIdx === -1) viewsIdx = 2;
  if (avgIdx === -1) avgIdx = 3;
  if (peakIdx === -1) peakIdx = 4;
  if (chatIdx === -1) chatIdx = 5;
  if (reactionsIdx === -1) reactionsIdx = 6;

  const lives: YoutubeLiveRow[] = [];

  for (let i = headerIndex + 1; i < rawLines.length; i++) {
    const cols = parseCsvRow(rawLines[i], delimiter);
    if (cols.length < 2) continue;

    const rawTitle = cols[titleIdx] || `Transmissão ao Vivo #${i}`;
    const rawDate = cols[dateIdx] || '';
    const dateParsed = parseYoutubeDate(rawDate);

    const viewsResult = parseYoutubeNumber(cols[viewsIdx]);
    const avgResult = parseYoutubeNumber(cols[avgIdx]);
    const peakResult = parseYoutubeNumber(cols[peakIdx]);
    const chatResult = parseYoutubeNumber(cols[chatIdx]);
    const reactionsResult = parseYoutubeNumber(cols[reactionsIdx]);

    const isProcessing =
      avgResult.isProcessing ||
      peakResult.isProcessing ||
      chatResult.isProcessing ||
      reactionsResult.isProcessing;

    // Chat consolidado (inclui ambas: Mensagens no Chat + Reações ao Vivo)
    let totalChat: number | null = null;
    if (chatResult.value !== null || reactionsResult.value !== null) {
      totalChat = (chatResult.value || 0) + (reactionsResult.value || 0);
    }

    const rawColumns: Record<string, string> = {};
    rawHeaders.forEach((h, idx) => {
      rawColumns[h] = cols[idx] || '';
    });

    lives.push({
      id: `yt_live_${i}_${Date.now()}`,
      title: rawTitle,
      rawDate,
      formattedDate: dateParsed.formattedDate,
      timestamp: dateParsed.timestamp,
      totalViews: viewsResult.value || 0,
      avgViewers: avgResult.value,
      peakViewers: peakResult.value,
      chatMessages: chatResult.value,
      liveReactions: reactionsResult.value,
      totalChat,
      isProcessing,
      rawColumns,
    });
  }

  // Sort by date descending
  lives.sort((a, b) => b.timestamp - a.timestamp);

  return {
    lives,
    totalLives: lives.length,
    headersDetected: rawHeaders,
  };
}
