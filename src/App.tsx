import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Tv, 
  Youtube, 
  CheckCircle2, 
  ClipboardPaste,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { CsvParseResult, StreamRow } from './types/twitch';
import { YoutubeLiveRow, YoutubeParseResult } from './types/youtube';
import { SAMPLE_TWITCH_CSV, parseTwitchCsv, parseNumber } from './utils/csvParser';
import { SAMPLE_YOUTUBE_TEXT, parseYoutubeCsvText } from './utils/youtubeParser';
import { CsvUploader } from './components/CsvUploader';
import { HorizontalDashboard } from './components/HorizontalDashboard';
import { YoutubeDashboard } from './components/YoutubeDashboard';
import { YoutubeTextModal } from './components/YoutubeTextModal';
import { HowToUseModal } from './components/HowToUseModal';
import { OAuthConnectModal } from './components/OAuthConnectModal';

interface AuthStatus {
  twitch: {
    connected: boolean;
    user: {
      id: string;
      login: string;
      displayName: string;
      profileImageUrl?: string;
    } | null;
    configured: boolean;
  };
  youtube: {
    connected: boolean;
    channel: {
      id: string;
      title: string;
      thumbnailUrl?: string;
    } | null;
    configured: boolean;
  };
  appUrl: string;
  callbacks: {
    twitch: string;
    youtube: string;
  };
}

export default function App() {
  const [activePlatform, setActivePlatform] = useState<'twitch' | 'youtube'>('twitch');
  
  // Twitch State
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [fileName, setFileName] = useState<string>('exemplo_oficial_twitch.csv');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [detectedViewsColumn, setDetectedViewsColumn] = useState<string>('Visualiz. ao vivo');
  const [showUploader, setShowUploader] = useState<boolean>(false);

  // YouTube State
  const [youtubeLives, setYoutubeLives] = useState<YoutubeLiveRow[]>([]);
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState<boolean>(false);

  // "Como Usar" Modal State
  const [isHowToUseOpen, setIsHowToUseOpen] = useState<boolean>(() => {
    return localStorage.getItem('stream_csv_hide_tutorial') !== 'true';
  });

  // OAuth Modal & Status State
  const [isOAuthModalOpen, setIsOAuthModalOpen] = useState<boolean>(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Notifications
  const [notification, setNotification] = useState<string | null>(null);

  // Fetch backend auth status
  const fetchAuthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = await res.json();
        setAuthStatus(data);
      }
    } catch (err) {
      console.warn('Backend auth status unavailable:', err);
    }
  }, []);

  // Sync Twitch data from Helix API
  const handleSyncTwitch = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/twitch/data');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao sincronizar dados da Twitch');
      }

      if (data.streams && data.streams.length > 0) {
        setStreams(data.streams);
        setFileName(`twitch_api_${authStatus?.twitch.user?.login || 'live'}.csv`);
        localStorage.setItem('twitch_csv_streams', JSON.stringify(data.streams));
        setNotification(`Sucesso! ${data.streams.length} transmissões sincronizadas diretamente da Twitch API.`);
      } else {
        setNotification('Nenhuma transmissão encontrada na sua conta da Twitch.');
      }
      setIsOAuthModalOpen(false);
    } catch (err: any) {
      setNotification(`Erro ao sincronizar Twitch: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Sync YouTube data from YouTube Data API
  const handleSyncYoutube = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/youtube/data');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao sincronizar dados do YouTube');
      }

      if (data.lives && data.lives.length > 0) {
        setYoutubeLives(data.lives);
        localStorage.setItem('youtube_csv_lives', JSON.stringify(data.lives));
        setNotification(`Sucesso! ${data.lives.length} transmissões sincronizadas diretamente do YouTube Studio.`);
      } else {
        setNotification('Nenhuma transmissão ao vivo encontrada no canal.');
      }
      setIsOAuthModalOpen(false);
    } catch (err: any) {
      setNotification(`Erro ao sincronizar YouTube: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Connect Twitch Channel directly without client id / secret
  const handleConnectTwitchChannel = async (username: string) => {
    const res = await fetch('/api/channel/twitch/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao conectar canal da Twitch');
    }

    if (data.streams) {
      setStreams(data.streams);
      setFileName(`twitch_${data.user?.login || 'live'}.csv`);
      localStorage.setItem('twitch_csv_streams', JSON.stringify(data.streams));
    }
    await fetchAuthStatus();
    setNotification(data.message || 'Canal Twitch conectado!');
    setTimeout(() => setNotification(null), 4000);
  };

  // Connect YouTube Channel directly without client id / secret
  const handleConnectYoutubeChannel = async (handle: string) => {
    const res = await fetch('/api/channel/youtube/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelHandle: handle }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao conectar canal do YouTube');
    }

    if (data.lives) {
      setYoutubeLives(data.lives);
      localStorage.setItem('youtube_csv_lives', JSON.stringify(data.lives));
    }
    await fetchAuthStatus();
    setNotification(data.message || 'Canal do YouTube conectado!');
    setTimeout(() => setNotification(null), 4000);
  };

  // Disconnect OAuth platform
  const handleDisconnect = async (platform: 'twitch' | 'youtube') => {
    try {
      await fetch(`/api/auth/disconnect/${platform}`, { method: 'POST' });
      await fetchAuthStatus();
      setNotification(`Conta ${platform === 'twitch' ? 'da Twitch' : 'do YouTube'} desconectada.`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Erro ao desconectar:', err);
    }
  };

  // Initialize from localStorage or sample data
  useEffect(() => {
    fetchAuthStatus();

    // 1. Load Twitch Data
    const saved = localStorage.getItem('twitch_csv_streams');
    const savedName = localStorage.getItem('twitch_csv_filename');
    const savedHeaders = localStorage.getItem('twitch_csv_headers');
    const savedViewsCol = localStorage.getItem('twitch_csv_views_col');

    if (savedHeaders) {
      try {
        const parsed = JSON.parse(savedHeaders);
        if (Array.isArray(parsed)) setRawHeaders(parsed);
      } catch (e) {}
    }
    if (savedViewsCol) {
      setDetectedViewsColumn(savedViewsCol);
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const restored = parsed.map((s: any) => ({
            ...s,
            timestamp: s.timestamp || (s.dateObj ? new Date(s.dateObj).getTime() : new Date(s.rawDate).getTime()) || 0,
          }));
          setStreams(restored);
          if (savedName) setFileName(savedName);
        }
      } catch (err) {
        console.warn('Erro ao carregar do cache local:', err);
      }
    } else {
      const result = parseTwitchCsv(SAMPLE_TWITCH_CSV, 'exemplo_oficial_twitch.csv');
      setStreams(result.streams);
      setFileName('exemplo_oficial_twitch.csv');
      setRawHeaders(result.rawHeaders);
      if (result.detectedViewsColumn) {
        setDetectedViewsColumn(result.detectedViewsColumn);
      }
    }

    // 2. Load YouTube Data
    const savedYt = localStorage.getItem('youtube_csv_lives');
    if (savedYt) {
      try {
        const parsedYt = JSON.parse(savedYt);
        if (Array.isArray(parsedYt) && parsedYt.length > 0) {
          const restored = parsedYt.map((s: any) => ({
            ...s,
            totalChat:
              s.totalChat !== undefined
                ? s.totalChat
                : s.chatMessages !== null || s.liveReactions !== null
                ? (s.chatMessages || 0) + (s.liveReactions || 0)
                : null,
          }));
          setYoutubeLives(restored);
        } else {
          const ytResult = parseYoutubeCsvText(SAMPLE_YOUTUBE_TEXT);
          setYoutubeLives(ytResult.lives);
        }
      } catch (e) {
        const ytResult = parseYoutubeCsvText(SAMPLE_YOUTUBE_TEXT);
        setYoutubeLives(ytResult.lives);
      }
    } else {
      const ytResult = parseYoutubeCsvText(SAMPLE_YOUTUBE_TEXT);
      setYoutubeLives(ytResult.lives);
    }
  }, [fetchAuthStatus]);

  // Listen for OAuth postMessage events from popup
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchAuthStatus();
        const platformName = event.data?.platform === 'twitch' ? 'Twitch' : 'YouTube';
        setNotification(`Login com ${platformName} concluído com sucesso!`);
        setTimeout(() => setNotification(null), 4000);

        // Auto sync if user just logged in
        if (event.data?.platform === 'twitch') {
          handleSyncTwitch();
        } else if (event.data?.platform === 'youtube') {
          handleSyncYoutube();
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setNotification(`Falha na autenticação: ${event.data?.error || 'Erro desconhecido'}`);
        setTimeout(() => setNotification(null), 5000);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [fetchAuthStatus]);

  const handleDataParsed = (result: CsvParseResult) => {
    setStreams(result.streams);
    const name = result.fileName || 'dados_twitch.csv';
    setFileName(name);
    setRawHeaders(result.rawHeaders);
    if (result.detectedViewsColumn) {
      setDetectedViewsColumn(result.detectedViewsColumn);
    }

    localStorage.setItem('twitch_csv_streams', JSON.stringify(result.streams));
    localStorage.setItem('twitch_csv_filename', name);
    localStorage.setItem('twitch_csv_headers', JSON.stringify(result.rawHeaders));
    if (result.detectedViewsColumn) {
      localStorage.setItem('twitch_csv_views_col', result.detectedViewsColumn);
    }

    setShowUploader(false);
    setNotification(
      `${result.streams.length} transmissões da Twitch carregadas! Coluna: "${result.detectedViewsColumn || 'Visualiz. ao vivo'}".`
    );
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSelectViewsColumn = (colName: string) => {
    setDetectedViewsColumn(colName);
    localStorage.setItem('twitch_csv_views_col', colName);

    setStreams((prev) => {
      const updated = prev.map((s) => {
        let val = 0;
        if (s.rawColumns && s.rawColumns[colName] !== undefined) {
          val = parseNumber(s.rawColumns[colName]);
        }
        return {
          ...s,
          views: val > 0 ? val : s.views,
          isEstimatedViews: false,
        };
      });
      localStorage.setItem('twitch_csv_streams', JSON.stringify(updated));
      return updated;
    });

    setNotification(`Coluna de Views alterada para "${colName}"!`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateStreamViews = (streamId: string, newViews: number) => {
    setStreams((prev) => {
      const updated = prev.map((s) =>
        s.id === streamId ? { ...s, views: newViews, isEstimatedViews: false } : s
      );
      localStorage.setItem('twitch_csv_streams', JSON.stringify(updated));
      return updated;
    });
    setNotification('Views atualizadas com sucesso!');
    setTimeout(() => setNotification(null), 2500);
  };

  const handleYoutubeParsed = (result: YoutubeParseResult) => {
    setYoutubeLives(result.lives);
    localStorage.setItem('youtube_csv_lives', JSON.stringify(result.lives));
    setNotification(`${result.lives.length} transmissões do YouTube importadas com sucesso!`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem('stream_csv_hide_tutorial', 'true');
    setIsHowToUseOpen(false);
    setNotification('Você pode reabrir o "Como Usar" a qualquer momento no topo da tela.');
    setTimeout(() => setNotification(null), 4000);
  };

  const isCurrentPlatformConnected = activePlatform === 'twitch' 
    ? authStatus?.twitch.connected 
    : authStatus?.youtube.connected;

  return (
    <div className="min-h-screen bg-[#0E0E10] text-[#EFEFF1] flex flex-col font-sans selection:bg-[#00F59B] selection:text-black">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-[#18181B]/95 backdrop-blur-md border-b border-[#2D2D35] px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg transition-colors ${
              activePlatform === 'twitch'
                ? 'bg-[#00F59B] text-black shadow-[#00F59B]/20'
                : 'bg-[#FF0000] text-white shadow-[#FF0000]/25'
            }`}>
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  STREAM<span className={activePlatform === 'twitch' ? 'text-[#00F59B]' : 'text-[#FF4E45]'}>CSV</span>
                </h1>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  activePlatform === 'twitch'
                    ? 'bg-[#9146FF]/20 text-[#BF94FF] border-[#9146FF]/30'
                    : 'bg-[#FF0000]/20 text-[#FF4E45] border-[#FF0000]/30'
                }`}>
                  {activePlatform === 'twitch' ? 'Twitch Analytics' : 'YouTube Studio'}
                </span>
              </div>
              <p className="text-xs text-[#ADADB8] hidden sm:block">
                Dashboard horizontal de métricas • .CSV e Login Oficial OAuth
              </p>
            </div>
          </div>

          {/* Center Platform Tab Switcher */}
          <div className="flex items-center p-1 bg-[#0E0E10] border border-[#2D2D35] rounded-2xl shadow-inner">
            <button
              onClick={() => {
                setActivePlatform('twitch');
                setShowUploader(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                activePlatform === 'twitch'
                  ? 'bg-[#9146FF] text-white shadow-md shadow-[#9146FF]/30'
                  : 'text-[#ADADB8] hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Twitch</span>
              {authStatus?.twitch.connected && (
                <span className="w-2 h-2 rounded-full bg-[#00F59B] animate-pulse" title="Conectado via OAuth" />
              )}
            </button>
            <button
              onClick={() => {
                setActivePlatform('youtube');
                setShowUploader(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                activePlatform === 'youtube'
                  ? 'bg-[#FF0000] text-white shadow-md shadow-[#FF0000]/30'
                  : 'text-[#ADADB8] hover:text-white'
              }`}
            >
              <Youtube className="w-3.5 h-3.5" />
              <span>YouTube</span>
              {authStatus?.youtube.connected && (
                <span className="w-2 h-2 rounded-full bg-[#00F59B] animate-pulse" title="Conectado via OAuth" />
              )}
            </button>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {/* OAuth Connection Status / Connect Button */}
            <button
              onClick={() => setIsOAuthModalOpen(true)}
              className={`py-2 px-3 sm:px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all shadow-md ${
                isCurrentPlatformConnected
                  ? 'bg-[#00F59B]/15 text-[#00F59B] border-[#00F59B]/30 hover:bg-[#00F59B]/25'
                  : 'bg-[#18181B] hover:bg-[#26262C] text-[#EFEFF1] border-[#3D3D45]'
              }`}
              title="Conectar ou gerenciar login OAuth"
            >
              <ShieldCheck className="w-4 h-4 text-[#00F59B]" />
              <span className="hidden md:inline">
                {isCurrentPlatformConnected ? 'Conectado via API' : 'Login / API'}
              </span>
              {isCurrentPlatformConnected && (
                <span className="w-2 h-2 rounded-full bg-[#00F59B]" />
              )}
            </button>

            {/* Como Usar Button */}
            <button
              onClick={() => setIsHowToUseOpen(true)}
              className="py-2 px-3 sm:px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-[#26262C] hover:bg-[#32323A] text-white border border-[#3D3D45] hover:border-[#00F59B]/50 transition-all shadow-md group"
              title="Abrir guia de como usar"
            >
              <HelpCircle className="w-4 h-4 text-[#00F59B] group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Como Usar</span>
            </button>

            {activePlatform === 'twitch' ? (
              <button
                onClick={() => setShowUploader(!showUploader)}
                className={`py-2 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                  showUploader
                    ? 'bg-[#2D2D35] text-white hover:bg-[#3D3D45]'
                    : 'bg-[#00F59B] hover:bg-[#00D687] text-black shadow-lg shadow-[#00F59B]/20'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>{showUploader ? 'Ver Dashboard' : 'Carregar / Trocar .CSV'}</span>
              </button>
            ) : (
              <button
                onClick={() => setIsYoutubeModalOpen(true)}
                className="py-2 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 bg-[#FF0000] hover:bg-[#CC0000] text-white shadow-lg shadow-[#FF0000]/25 transition-all"
              >
                <ClipboardPaste className="w-4 h-4" />
                <span>Colar Texto .CSV</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Connected Account Quick Sync Banner (if logged in via OAuth) */}
      {isCurrentPlatformConnected && (
        <div className="bg-[#18181B] border-b border-[#2D2D35] px-4 lg:px-8 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00F59B]" />
              <span className="text-[#ADADB8]">
                Conectado como{' '}
                <strong className="text-white">
                  {activePlatform === 'twitch'
                    ? authStatus?.twitch.user?.displayName || authStatus?.twitch.user?.login
                    : authStatus?.youtube.channel?.title}
                </strong>{' '}
                ({activePlatform === 'twitch' ? 'Twitch Helix API' : 'YouTube Data API'})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={activePlatform === 'twitch' ? handleSyncTwitch : handleSyncYoutube}
                disabled={isSyncing}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all text-white ${
                  activePlatform === 'twitch' ? 'bg-[#9146FF] hover:bg-[#772CE8]' : 'bg-[#FF0000] hover:bg-[#CC0000]'
                } ${isSyncing ? 'opacity-50 cursor-wait' : ''}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Atualizar Dados da API'}</span>
              </button>
              <button
                onClick={() => handleDisconnect(activePlatform)}
                className="p-1.5 text-[#70707B] hover:text-red-400 rounded-lg hover:bg-[#26262C] transition-colors"
                title="Desconectar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in slide-in-from-bottom-4">
          <div className="p-4 rounded-2xl shadow-2xl border border-[#00F59B]/40 bg-[#18181B]/95 text-white flex items-center gap-3 backdrop-blur-md">
            <CheckCircle2 className="w-5 h-5 text-[#00F59B] shrink-0" />
            <span className="text-sm font-semibold">{notification}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 space-y-8">
        {activePlatform === 'twitch' ? (
          <>
            {/* Twitch CSV Uploader Section */}
            {showUploader && (
              <section className="animate-in fade-in zoom-in-95 duration-200">
                <CsvUploader
                  onDataParsed={handleDataParsed}
                  currentCount={streams.length}
                  currentFileName={fileName}
                />
              </section>
            )}

            {/* Twitch Horizontal Dashboard */}
            {streams.length > 0 ? (
              <section className="space-y-6">
                <HorizontalDashboard
                  streams={streams}
                  fileName={fileName}
                  rawHeaders={rawHeaders}
                  detectedViewsColumn={detectedViewsColumn}
                  onUploadNewFile={() => setShowUploader(true)}
                  onSelectViewsColumn={handleSelectViewsColumn}
                  onUpdateStreamViews={handleUpdateStreamViews}
                />
              </section>
            ) : (
              <div className="p-12 text-center bg-[#18181B] rounded-3xl border border-[#2D2D35] space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#00F59B]/15 text-[#00F59B] flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white">Nenhum dado de live da Twitch carregado</h2>
                <p className="text-sm text-[#ADADB8] max-w-md mx-auto">
                  Envie o arquivo .CSV exportado do seu painel de criador da Twitch ou conecte sua conta via OAuth.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setShowUploader(true)}
                    className="py-3 px-6 rounded-xl font-bold bg-[#00F59B] hover:bg-[#00D687] text-black text-sm inline-flex items-center gap-2 shadow-lg shadow-[#00F59B]/20"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Selecionar Arquivo .CSV</span>
                  </button>
                  <button
                    onClick={() => setIsOAuthModalOpen(true)}
                    className="py-3 px-6 rounded-xl font-bold bg-[#9146FF] hover:bg-[#772CE8] text-white text-sm inline-flex items-center gap-2 shadow-lg shadow-[#9146FF]/20"
                  >
                    <Tv className="w-4 h-4" />
                    <span>Conectar com Twitch</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* YouTube Dashboard Section */
          <section className="space-y-6">
            <YoutubeDashboard
              lives={youtubeLives}
              onOpenPasteModal={() => setIsYoutubeModalOpen(true)}
            />
          </section>
        )}
      </main>

      {/* YouTube Text Paste Modal */}
      <YoutubeTextModal
        isOpen={isYoutubeModalOpen}
        onClose={() => setIsYoutubeModalOpen(false)}
        onDataParsed={handleYoutubeParsed}
      />

      {/* Como Usar Tutorial Modal */}
      <HowToUseModal
        isOpen={isHowToUseOpen}
        onClose={() => setIsHowToUseOpen(false)}
        onDontShowAgain={handleDontShowAgain}
      />

      {/* Direct Channel Login Modal */}
      <OAuthConnectModal
        isOpen={isOAuthModalOpen}
        onClose={() => setIsOAuthModalOpen(false)}
        status={authStatus}
        onConnectTwitchChannel={handleConnectTwitchChannel}
        onConnectYoutubeChannel={handleConnectYoutubeChannel}
        onSyncTwitch={handleSyncTwitch}
        onSyncYoutube={handleSyncYoutube}
        onDisconnect={handleDisconnect}
        activePlatform={activePlatform}
      />

      {/* Footer */}
      <footer className="border-t border-[#26262C] bg-[#141416] py-6 px-4 text-center text-xs text-[#70707B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
              activePlatform === 'twitch' ? 'bg-[#00F59B] text-black' : 'bg-[#FF0000] text-white'
            }`}>
              CSV
            </div>
            <span>Stream CSV Analytics • Suporte para Twitch e YouTube via .CSV e OAuth 2.0</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOAuthModalOpen(true)}
              className="text-[#ADADB8] hover:text-[#00F59B] underline transition-colors"
            >
              Conexão OAuth
            </button>
            <span>•</span>
            <button
              onClick={() => setIsHowToUseOpen(true)}
              className="text-[#ADADB8] hover:text-[#00F59B] underline transition-colors"
            >
              Como Usar
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
