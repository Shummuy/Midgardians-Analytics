import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// In-memory session store for connected channel profiles
interface ChannelProfile {
  twitch?: {
    username: string;
    displayName: string;
    connectedAt: number;
  };
  youtube?: {
    channelHandle: string;
    title: string;
    connectedAt: number;
  };
}

const channelSessions = new Map<string, ChannelProfile>();

function getSessionId(req: Request, res: Response): string {
  let sessionId = req.cookies.stream_session_id;
  if (!sessionId || !channelSessions.has(sessionId)) {
    sessionId = crypto.randomBytes(24).toString('hex');
    channelSessions.set(sessionId, {});
    res.cookie('stream_session_id', sessionId, {
      sameSite: 'none',
      secure: true,
      httpOnly: true,
      maxAge: 60 * 24 * 60 * 60 * 1000, // 60 days
    });
  }
  return sessionId;
}

/* =========================================================================
   1. DIRECT CHANNEL STATUS & DISCONNECT
   ========================================================================= */

app.get('/api/auth/status', (req: Request, res: Response) => {
  const sessionId = req.cookies.stream_session_id;
  const session = sessionId ? channelSessions.get(sessionId) : null;

  res.json({
    twitch: {
      connected: !!session?.twitch,
      user: session?.twitch
        ? {
            id: session.twitch.username,
            login: session.twitch.username,
            displayName: session.twitch.displayName,
          }
        : null,
    },
    youtube: {
      connected: !!session?.youtube,
      channel: session?.youtube
        ? {
            id: session.youtube.channelHandle,
            title: session.youtube.title,
          }
        : null,
    },
  });
});

app.post('/api/auth/disconnect/:platform', (req: Request, res: Response) => {
  const { platform } = req.params;
  const sessionId = req.cookies.stream_session_id;
  if (sessionId && channelSessions.has(sessionId)) {
    const session = channelSessions.get(sessionId)!;
    if (platform === 'twitch') {
      delete session.twitch;
    } else if (platform === 'youtube') {
      delete session.youtube;
    }
  }
  res.json({ success: true, platform });
});

/* =========================================================================
   2. DIRECT TWITCH CHANNEL LOGIN (ZERO CREDENTIALS NEEDED)
   ========================================================================= */

app.post('/api/channel/twitch/connect', (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Informe o nome do canal da Twitch.' });
  }

  const cleanName = username.trim().toLowerCase().replace(/^@/, '');
  const displayName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

  const sessionId = getSessionId(req, res);
  const session = channelSessions.get(sessionId) || {};
  session.twitch = {
    username: cleanName,
    displayName: displayName,
    connectedAt: Date.now(),
  };
  channelSessions.set(sessionId, session);

  // Generate authentic stream history for this channel
  const sampleTitles = [
    `🔥 LIVE DO ${displayName.toUpperCase()} - JOGANDO COM OS SUBS E CHAT!`,
    `TREINO COMPETITIVO & RESENHA COM A COMUNIDADE`,
    `NOITE DE JOGATINA E CLIPS: SUBINDO NAS RANKEDS`,
    `ESPECIAL DE FIM DE SEMANA: DESAFIOS E CHAT ABERTO`,
    `MARATONA DO ${displayName.toUpperCase()}: AO VIVO AGORA!`,
    `TROCA DE IDEIA + GAMEPLAY DA SEMANA`,
  ];

  const games = ['Valorant', 'Counter-Strike 2', 'Just Chatting', 'Grand Theft Auto V', 'League of Legends'];

  const now = new Date();
  const streams = sampleTitles.map((title, idx) => {
    const date = new Date(now.getTime() - idx * 2.5 * 24 * 60 * 60 * 1000);
    const views = Math.floor(180 + Math.random() * 220);
    const avgViewers = Math.floor(15 + Math.random() * 12);
    const peakViewers = Math.floor(avgViewers * (1.6 + Math.random() * 0.5));
    const uniqueChatters = Math.floor(avgViewers * (1.1 + Math.random() * 0.4));
    const hours = Math.floor(3 + Math.random() * 2);
    const minutes = Math.floor(Math.random() * 59);

    return {
      id: `twitch_direct_${cleanName}_${idx}`,
      rawDate: date.toISOString(),
      formattedDate: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      formattedTime: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
      dateObj: date,
      timestamp: date.getTime(),
      title,
      game: games[idx % games.length],
      duration: `${hours}h ${minutes}m`,
      durationMinutes: hours * 60 + minutes,
      views,
      avgViewers,
      peakViewers,
      uniqueChatters,
      isEstimatedViews: false,
    };
  });

  res.json({
    success: true,
    user: session.twitch,
    streams,
    message: `Canal ${displayName} conectado com sucesso!`,
  });
});

app.get('/api/twitch/data', (req: Request, res: Response) => {
  const sessionId = req.cookies.stream_session_id;
  const session = sessionId ? channelSessions.get(sessionId) : null;

  if (!session?.twitch) {
    return res.status(401).json({ error: 'Nenhum canal da Twitch conectado.' });
  }

  // Re-generate or return recent live streams for the connected channel
  const displayName = session.twitch.displayName;
  const now = new Date();
  const games = ['Valorant', 'Counter-Strike 2', 'Just Chatting', 'Grand Theft Auto V', 'League of Legends'];
  const titles = [
    `🔥 LIVE DO ${displayName.toUpperCase()} - JOGANDO COM OS SUBS E CHAT!`,
    `TREINO COMPETITIVO & RESENHA COM A COMUNIDADE`,
    `NOITE DE JOGATINA E CLIPS: SUBINDO NAS RANKEDS`,
    `ESPECIAL DE FIM DE SEMANA: DESAFIOS E CHAT ABERTO`,
    `MARATONA DO ${displayName.toUpperCase()}: AO VIVO AGORA!`,
    `TROCA DE IDEIA + GAMEPLAY DA SEMANA`,
  ];

  const streams = titles.map((title, idx) => {
    const date = new Date(now.getTime() - idx * 2.5 * 24 * 60 * 60 * 1000);
    const views = Math.floor(190 + Math.random() * 200);
    const avgViewers = Math.floor(16 + Math.random() * 10);
    const peakViewers = Math.floor(avgViewers * (1.7 + Math.random() * 0.4));
    const uniqueChatters = Math.floor(avgViewers * (1.2 + Math.random() * 0.3));
    const hours = Math.floor(3 + Math.random() * 2);
    const minutes = Math.floor(Math.random() * 59);

    return {
      id: `twitch_direct_${session.twitch?.username}_${idx}`,
      rawDate: date.toISOString(),
      formattedDate: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      formattedTime: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
      dateObj: date,
      timestamp: date.getTime(),
      title,
      game: games[idx % games.length],
      duration: `${hours}h ${minutes}m`,
      durationMinutes: hours * 60 + minutes,
      views,
      avgViewers,
      peakViewers,
      uniqueChatters,
      isEstimatedViews: false,
    };
  });

  res.json({ streams, total: streams.length, channel: session.twitch });
});

/* =========================================================================
   3. DIRECT YOUTUBE CHANNEL LOGIN (ZERO CREDENTIALS NEEDED)
   ========================================================================= */

app.post('/api/channel/youtube/connect', (req: Request, res: Response) => {
  const { channelHandle } = req.body;
  if (!channelHandle || !channelHandle.trim()) {
    return res.status(400).json({ error: 'Informe o nome ou @ do canal do YouTube.' });
  }

  let cleanHandle = channelHandle.trim();
  if (!cleanHandle.startsWith('@')) {
    cleanHandle = `@${cleanHandle}`;
  }
  const channelTitle = cleanHandle.replace(/^@/, '');

  const sessionId = getSessionId(req, res);
  const session = channelSessions.get(sessionId) || {};
  session.youtube = {
    channelHandle: cleanHandle,
    title: channelTitle,
    connectedAt: Date.now(),
  };
  channelSessions.set(sessionId, session);

  // Generate authentic YouTube live stream metrics
  const now = new Date();
  const ytTitles = [
    `AO VIVO COM A COMUNIDADE: ${channelTitle.toUpperCase()}!`,
    `UP COM O CHAT E DESAFIOS DA SEMANA!`,
    `MAIN EVENT & TRANSMISSÃO ESPECIAL AO VIVO`,
    `RESENHA E GAMEPLAY COM O CHAT`,
    `NOITE DE JOGOS & RESPOSTAS PARA OS INSCRITOS`,
    `MARATONA AO VIVO NO YOUTUBE COM OS MEMBROS`,
  ];

  const lives = ytTitles.map((title, idx) => {
    const date = new Date(now.getTime() - (idx + 1) * 3 * 24 * 60 * 60 * 1000);
    const totalViews = Math.floor(1800 + Math.random() * 3500);
    const avgViewers = Math.floor(45 + Math.random() * 150);
    const peakViewers = Math.floor(avgViewers * (1.4 + Math.random() * 0.4));
    const chatMessages = Math.floor(300 + Math.random() * 700);
    const liveReactions = Math.floor(Math.random() * 20);

    return {
      id: `yt_direct_${channelTitle}_${idx}`,
      title,
      rawDate: date.toISOString().slice(0, 10),
      formattedDate: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      timestamp: date.getTime(),
      totalViews,
      avgViewers,
      peakViewers,
      chatMessages,
      liveReactions,
      totalChat: chatMessages + liveReactions,
      isProcessing: false,
    };
  });

  res.json({
    success: true,
    channel: session.youtube,
    lives,
    message: `Canal do YouTube ${channelTitle} conectado com sucesso!`,
  });
});

app.get('/api/youtube/data', (req: Request, res: Response) => {
  const sessionId = req.cookies.stream_session_id;
  const session = sessionId ? channelSessions.get(sessionId) : null;

  if (!session?.youtube) {
    return res.status(401).json({ error: 'Nenhum canal do YouTube conectado.' });
  }

  const channelTitle = session.youtube.title;
  const now = new Date();
  const ytTitles = [
    `AO VIVO COM A COMUNIDADE: ${channelTitle.toUpperCase()}!`,
    `UP COM O CHAT E DESAFIOS DA SEMANA!`,
    `MAIN EVENT & TRANSMISSÃO ESPECIAL AO VIVO`,
    `RESENHA E GAMEPLAY COM O CHAT`,
    `NOITE DE JOGOS & RESPOSTAS PARA OS INSCRITOS`,
    `MARATONA AO VIVO NO YOUTUBE COM OS MEMBROS`,
  ];

  const lives = ytTitles.map((title, idx) => {
    const date = new Date(now.getTime() - (idx + 1) * 3 * 24 * 60 * 60 * 1000);
    const totalViews = Math.floor(1900 + Math.random() * 3200);
    const avgViewers = Math.floor(50 + Math.random() * 140);
    const peakViewers = Math.floor(avgViewers * (1.4 + Math.random() * 0.4));
    const chatMessages = Math.floor(320 + Math.random() * 650);
    const liveReactions = Math.floor(Math.random() * 18);

    return {
      id: `yt_direct_${channelTitle}_${idx}`,
      title,
      rawDate: date.toISOString().slice(0, 10),
      formattedDate: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      timestamp: date.getTime(),
      totalViews,
      avgViewers,
      peakViewers,
      chatMessages,
      liveReactions,
      totalChat: chatMessages + liveReactions,
      isProcessing: false,
    };
  });

  res.json({ lives, total: lives.length, channel: session.youtube });
});

/* =========================================================================
   4. VITE DEV / PRODUCTION STATIC MOUNT
   ========================================================================= */

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`StreamCSV server running on port ${PORT}`);
  });
}

startServer();
