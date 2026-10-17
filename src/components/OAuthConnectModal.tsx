import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Tv, 
  Youtube, 
  CheckCircle2, 
  RefreshCw, 
  LogOut, 
  Sparkles,
  ArrowRight,
  UserCheck,
  Search,
  Check
} from 'lucide-react';

interface AuthStatus {
  twitch: {
    connected: boolean;
    user: {
      id: string;
      login: string;
      displayName: string;
      profileImageUrl?: string;
    } | null;
  };
  youtube: {
    connected: boolean;
    channel: {
      id: string;
      title: string;
      thumbnailUrl?: string;
    } | null;
  };
}

interface OAuthConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: AuthStatus | null;
  onConnectTwitchChannel: (username: string) => Promise<void>;
  onConnectYoutubeChannel: (handle: string) => Promise<void>;
  onSyncTwitch: () => void;
  onSyncYoutube: () => void;
  onDisconnect: (platform: 'twitch' | 'youtube') => void;
  activePlatform: 'twitch' | 'youtube';
}

export const OAuthConnectModal: React.FC<OAuthConnectModalProps> = ({
  isOpen,
  onClose,
  status,
  onConnectTwitchChannel,
  onConnectYoutubeChannel,
  onSyncTwitch,
  onSyncYoutube,
  onDisconnect,
  activePlatform,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<'twitch' | 'youtube'>(activePlatform);
  const [channelInput, setChannelInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelInput.trim()) {
      setErrorMsg('Por favor, informe o nome ou @ do canal.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      if (selectedPlatform === 'twitch') {
        await onConnectTwitchChannel(channelInput.trim());
      } else {
        await onConnectYoutubeChannel(channelInput.trim());
      }
      setChannelInput('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao conectar ao canal. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const isTwitchConnected = status?.twitch.connected;
  const isYoutubeConnected = status?.youtube.connected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#18181B] border border-[#2D2D35] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2D2D35] pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg ${
              selectedPlatform === 'twitch' ? 'bg-[#9146FF]' : 'bg-[#FF0000]'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Login Direto do Canal</h2>
              <p className="text-xs text-[#ADADB8]">
                Sem chaves de API nem Client ID/Secret. Conecte pelo nome do canal!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#70707B] hover:text-white rounded-xl hover:bg-[#26262C] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selector */}
        <div className="grid grid-cols-2 p-1 bg-[#0E0E10] border border-[#2D2D35] rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => {
              setSelectedPlatform('twitch');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
              selectedPlatform === 'twitch'
                ? 'bg-[#9146FF] text-white shadow-md shadow-[#9146FF]/30'
                : 'text-[#ADADB8] hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Twitch</span>
            {isTwitchConnected && <span className="w-2 h-2 rounded-full bg-[#00F59B]" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedPlatform('youtube');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
              selectedPlatform === 'youtube'
                ? 'bg-[#FF0000] text-white shadow-md shadow-[#FF0000]/30'
                : 'text-[#ADADB8] hover:text-white'
            }`}
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>YouTube</span>
            {isYoutubeConnected && <span className="w-2 h-2 rounded-full bg-[#00F59B]" />}
          </button>
        </div>

        {/* Status if already connected to this platform */}
        {selectedPlatform === 'twitch' && isTwitchConnected && (
          <div className="p-4 rounded-2xl bg-[#00F59B]/10 border border-[#00F59B]/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#9146FF] text-white flex items-center justify-center font-bold">
                {status.twitch.user?.displayName?.charAt(0) || 'T'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">
                    {status.twitch.user?.displayName || status.twitch.user?.login}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00F59B]" />
                </div>
                <span className="text-[11px] text-[#00F59B] font-semibold">Canal Twitch Conectado</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onSyncTwitch}
                className="px-3 py-1.5 rounded-xl bg-[#9146FF] hover:bg-[#772CE8] text-white font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Atualizar</span>
              </button>
              <button
                onClick={() => onDisconnect('twitch')}
                className="p-1.5 rounded-xl bg-[#26262C] hover:bg-[#32323A] text-[#ADADB8] hover:text-red-400 transition-colors"
                title="Desconectar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {selectedPlatform === 'youtube' && isYoutubeConnected && (
          <div className="p-4 rounded-2xl bg-[#00F59B]/10 border border-[#00F59B]/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF0000] text-white flex items-center justify-center font-bold">
                {status.youtube.channel?.title?.charAt(0) || 'Y'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">
                    {status.youtube.channel?.title}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00F59B]" />
                </div>
                <span className="text-[11px] text-[#00F59B] font-semibold">Canal YouTube Conectado</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onSyncYoutube}
                className="px-3 py-1.5 rounded-xl bg-[#FF0000] hover:bg-[#CC0000] text-white font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Atualizar</span>
              </button>
              <button
                onClick={() => onDisconnect('youtube')}
                className="p-1.5 rounded-xl bg-[#26262C] hover:bg-[#32323A] text-[#ADADB8] hover:text-red-400 transition-colors"
                title="Desconectar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Channel Login Input Form */}
        <form onSubmit={handleConnect} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#EFEFF1] flex items-center justify-between">
              <span>
                {selectedPlatform === 'twitch' ? 'Nome do seu Canal na Twitch:' : 'Nome ou @ do seu Canal no YouTube:'}
              </span>
              <span className="text-[11px] text-[#70707B] font-normal">Apenas o nome público</span>
            </label>

            <div className="relative">
              <input
                type="text"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                placeholder={selectedPlatform === 'twitch' ? 'ex: alanzoka ou seu_canal' : 'ex: @CanalDoStreamer ou Nome do Canal'}
                className="w-full pl-4 pr-10 py-3 bg-[#0E0E10] border border-[#2D2D35] focus:border-[#00F59B] rounded-2xl text-sm text-white placeholder-[#50505A] outline-none transition-all"
                autoFocus
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#70707B]">
                {selectedPlatform === 'twitch' ? <Tv className="w-4 h-4 text-[#9146FF]" /> : <Youtube className="w-4 h-4 text-[#FF0000]" />}
              </div>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl">
              {errorMsg}
            </p>
          )}

          {/* Quick suggestions */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-[#70707B]">
            <span>Exemplos rápidos:</span>
            {selectedPlatform === 'twitch' ? (
              ['alanzoka', 'gaules', 'casimito'].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setChannelInput(s)}
                  className="px-2 py-0.5 rounded-lg bg-[#26262C] hover:bg-[#32323A] text-[#ADADB8] hover:text-white transition-colors"
                >
                  {s}
                </button>
              ))
            ) : (
              ['@CazeTV', '@FlowPodcast', '@Gaules'].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setChannelInput(s)}
                  className="px-2 py-0.5 rounded-lg bg-[#26262C] hover:bg-[#32323A] text-[#ADADB8] hover:text-white transition-colors"
                >
                  {s}
                </button>
              ))
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-lg ${
              selectedPlatform === 'twitch'
                ? 'bg-[#9146FF] hover:bg-[#772CE8] shadow-[#9146FF]/25'
                : 'bg-[#FF0000] hover:bg-[#CC0000] shadow-[#FF0000]/25'
            } ${loading ? 'opacity-60 cursor-wait' : ''}`}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
            <span>
              {loading ? 'Buscando dados do canal...' : `Conectar Canal ${selectedPlatform === 'twitch' ? 'Twitch' : 'YouTube'}`}
            </span>
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-2 border-t border-[#2D2D35] flex items-center justify-between text-xs text-[#70707B]">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#00F59B]" />
            Sem necessidade de cadastro no console de desenvolvedor.
          </span>
          <button
            onClick={onClose}
            className="text-[#ADADB8] hover:text-white font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
