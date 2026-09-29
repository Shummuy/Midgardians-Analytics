import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  Tv, 
  Youtube, 
  Copy, 
  Check, 
  ArrowRight, 
  ExternalLink, 
  Sparkles, 
  FileSpreadsheet, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDontShowAgain: () => void;
}

export const HowToUseModal: React.FC<HowToUseModalProps> = ({
  isOpen,
  onClose,
  onDontShowAgain,
}) => {
  const [activeTab, setActiveTab] = useState<'twitch' | 'youtube'>('twitch');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  if (!isOpen) return null;

  const youtubePrompt = 'Me de os dados das lives do mês de X. Preciso dos numeros de views totais, medias de views, pico de views e mensagens e reações do chat. Envie em .csv';

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(youtubePrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#18181B] border border-[#2D2D35] rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2D2D35] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#9146FF]/20 border border-[#9146FF]/40 text-[#BF94FF] flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5 text-[#9146FF]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">Como Usar o StreamCSV</h2>
              <p className="text-xs text-[#ADADB8]">
                Aprenda a extrair os dados oficiais da Twitch e do YouTube Studio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#70707B] hover:text-white rounded-xl hover:bg-[#26262C] transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-[#0E0E10] border border-[#2D2D35] rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('twitch')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'twitch'
                ? 'bg-[#9146FF] text-white shadow-lg shadow-[#9146FF]/30'
                : 'text-[#ADADB8] hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Passo a Passo: Twitch</span>
          </button>
          <button
            onClick={() => setActiveTab('youtube')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'youtube'
                ? 'bg-[#FF0000] text-white shadow-lg shadow-[#FF0000]/30'
                : 'text-[#ADADB8] hover:text-white'
            }`}
          >
            <Youtube className="w-4 h-4" />
            <span>Passo a Passo: YouTube</span>
          </button>
        </div>

        {/* Twitch Tutorial Tab */}
        {activeTab === 'twitch' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-[#0E0E10] border border-[#2D2D35] rounded-2xl p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-bold text-[#00F59B] flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Como exportar o arquivo .CSV da Twitch:
              </h3>

              <ol className="space-y-3 text-xs sm:text-sm text-[#EFEFF1]">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#9146FF]/20 text-[#BF94FF] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-[#9146FF]/30">
                    1
                  </span>
                  <div>
                    Acesse o seu <strong>Painel de Controle do Criador</strong> na Twitch (
                    <a
                      href="https://dashboard.twitch.tv"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#9146FF] hover:underline font-mono inline-flex items-center gap-1"
                    >
                      dashboard.twitch.tv <ExternalLink className="w-3 h-3" />
                    </a>
                    ).
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#9146FF]/20 text-[#BF94FF] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-[#9146FF]/30">
                    2
                  </span>
                  <div>
                    No menu lateral esquerdo, clique em <strong>Estatísticas</strong> (ou <em>Insights</em>) e selecione <strong>Análise do Canal</strong> (<em>Channel Analytics</em>).
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#9146FF]/20 text-[#BF94FF] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-[#9146FF]/30">
                    3
                  </span>
                  <div>
                    No seletor de datas no topo da página, escolha o período desejado (por exemplo, <em>Últimos 30 dias</em> ou o <em>mês específico</em>).
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#9146FF]/20 text-[#BF94FF] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-[#9146FF]/30">
                    4
                  </span>
                  <div>
                    Clique no botão <strong>Exportar dados</strong> (<em>Export Data</em>) localizado no canto superior direito do gráfico/tabela.
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#00F59B]/20 text-[#00F59B] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-[#00F59B]/30">
                    5
                  </span>
                  <div>
                    Volte aqui na aba da <strong>Twitch</strong>, clique em <strong>"Carregar / Trocar .CSV"</strong> e selecione o arquivo baixado! O sistema puxará automaticamente o dado de <strong>Visualiz. ao vivo</strong> e calculará as médias e picos.
                  </div>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* YouTube Tutorial Tab */}
        {activeTab === 'youtube' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-[#0E0E10] border border-[#2D2D35] rounded-2xl p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-bold text-[#FF4E45] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF0000]" />
                Como solicitar os dados na IA do YouTube Studio:
              </h3>

              <ol className="space-y-3 text-xs sm:text-sm text-[#EFEFF1]">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#FF0000]/20 text-[#FF4E45] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-[#FF0000]/30">
                    1
                  </span>
                  <div>
                    Acesse o seu <strong>YouTube Studio</strong> (
                    <a
                      href="https://studio.youtube.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#FF4E45] hover:underline font-mono inline-flex items-center gap-1"
                    >
                      studio.youtube.com <ExternalLink className="w-3 h-3" />
                    </a>
                    ) e abra o assistente de IA / chat de análise de estatísticas.
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#FF0000]/20 text-[#FF4E45] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-[#FF0000]/30">
                    2
                  </span>
                  <div className="w-full space-y-2">
                    <div>
                      Envie para a IA <strong>exatamente o comando abaixo</strong> (lembre-se de trocar o <em>"X"</em> pelo mês que você quer analisar, como <em>Setembro</em>):
                    </div>
                    {/* Prompt Box */}
                    <div className="bg-[#18181B] border border-[#FF0000]/30 rounded-xl p-3.5 relative group">
                      <p className="font-mono text-xs text-[#FF4E45] pr-12 select-all leading-relaxed">
                        "{youtubePrompt}"
                      </p>
                      <button
                        onClick={handleCopyPrompt}
                        className="absolute right-2.5 top-2.5 px-2.5 py-1.5 rounded-lg bg-[#FF0000] hover:bg-[#CC0000] text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-md shadow-[#FF0000]/20"
                        title="Copiar comando"
                      >
                        {copiedPrompt ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPrompt ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#FF0000]/20 text-[#FF4E45] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-[#FF0000]/30">
                    3
                  </span>
                  <div>
                    A IA gerará a resposta no formato de texto tabular `.csv`. Copie toda a resposta gerada.
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#00F59B]/20 text-[#00F59B] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-[#00F59B]/30">
                    4
                  </span>
                  <div>
                    Volte aqui na aba <strong>YouTube</strong>, clique em <strong>"Colar Texto .CSV"</strong> e cole o conteúdo. O dashboard unifica automaticamente as visualizações, médias, picos e consolida as mensagens e reações no <strong>Chat</strong>!
                  </div>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Footer Actions: Don't show again + Close */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#2D2D35] pt-4">
          <button
            onClick={onDontShowAgain}
            className="text-xs text-[#ADADB8] hover:text-white transition-colors underline text-center sm:text-left py-1"
          >
            Não aparecer novamente ao abrir
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#00F59B] hover:bg-[#00D687] text-black font-bold text-xs sm:text-sm transition-all shadow-lg shadow-[#00F59B]/20 text-center"
          >
            Entendi, ir para o Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
