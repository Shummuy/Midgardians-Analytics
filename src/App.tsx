import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Tv, 
  Youtube, 
  CheckCircle2, 
  ClipboardPaste,
  HelpCircle
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

  // "Como Usar" Modal State (Appears on open by default unless marked "Não aparecer novamente")
  const [isHowToUseOpen, setIsHowToUseOpen] = useState<boolean>(() => {
    return localStorage.getItem('stream_csv_hide_tutorial') !== 'true';
  });

  // Notifications
  const [notification, setNotification] = useState<string | null>(null);

  // Initialize from localStorage or sample data
  useEffect(() => {
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
  }, []);

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
                Dashboard horizontal de métricas a partir de .CSV
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
            </button>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Como Usar Button in the top corner */}
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
                  Envie o arquivo .CSV exportado do seu painel de criador da Twitch para gerar o dashboard horizontal.
                </p>
                <button
                  onClick={() => setShowUploader(true)}
                  className="py-3 px-6 rounded-xl font-bold bg-[#00F59B] hover:bg-[#00D687] text-black text-sm inline-flex items-center gap-2 shadow-lg shadow-[#00F59B]/20"
                >
                  <Upload className="w-4 h-4" />
                  <span>Selecionar Arquivo .CSV</span>
                </button>
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

      {/* Como Usar Tutorial Modal (Opens on load, can be suppressed or reopened) */}
      <HowToUseModal
        isOpen={isHowToUseOpen}
        onClose={() => setIsHowToUseOpen(false)}
        onDontShowAgain={handleDontShowAgain}
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
            <span>Stream CSV Analytics • Suporte para Twitch e YouTube</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHowToUseOpen(true)}
              className="text-[#ADADB8] hover:text-[#00F59B] underline transition-colors"
            >
              Ver instruções (Como Usar)
            </button>
            <span>•</span>
            <span>Processamento de arquivos e textos .CSV estruturados.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
