import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  Sparkles, 
  HelpCircle, 
  ExternalLink, 
  Clipboard, 
  AlertCircle,
  FileText,
  Youtube,
  Tv
} from 'lucide-react';
import { SAMPLE_TWITCH_CSV, SAMPLE_YOUTUBE_CSV, parseStreamCsv } from '../utils/csvParser';
import { CsvParseResult, StreamRow, StreamingPlatform } from '../types/twitch';

interface CsvUploaderProps {
  platform?: StreamingPlatform;
  onDataParsed: (result: CsvParseResult) => void;
  currentCount: number;
  currentFileName?: string;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({
  platform = 'twitch',
  onDataParsed,
  currentCount,
  currentFileName,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isYouTube = platform === 'youtube';
  const themeColor = isYouTube ? '#FF0000' : '#00F59B';
  const platformName = isYouTube ? 'YouTube Studio' : 'Twitch';

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setErrorMessage('Por favor, envie um arquivo no formato .CSV.');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const result = parseStreamCsv(content, platform, file.name);
        if (result.streams.length === 0) {
          setErrorMessage('Nenhuma transmissão com dados encontrada no arquivo. Verifique o formato do CSV.');
          return;
        }
        onDataParsed(result);
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao processar o arquivo CSV.');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      setErrorMessage('Cole o texto do CSV antes de processar.');
      return;
    }
    setErrorMessage(null);
    const defaultName = isYouTube ? 'dados_youtube.csv' : 'dados_twitch.csv';
    const result = parseStreamCsv(pastedText, platform, defaultName);
    if (result.streams.length === 0) {
      setErrorMessage('Não foi possível identificar colunas válidas no texto colado.');
      return;
    }
    onDataParsed(result);
    setPasteMode(false);
    setPastedText('');
  };

  const handleLoadSample = () => {
    const sampleText = isYouTube ? SAMPLE_YOUTUBE_CSV : SAMPLE_TWITCH_CSV;
    const sampleFileName = isYouTube ? 'exemplo_youtube_studio.csv' : 'exemplo_oficial_twitch.csv';
    const result = parseStreamCsv(sampleText, platform, sampleFileName);
    onDataParsed(result);
    setErrorMessage(null);
  };

  return (
    <div className={`bg-[#18181B] border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${
      isYouTube ? 'border-red-900/40' : 'border-[#2D2D35]'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2D2D35] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div 
              className={`w-10 h-10 rounded-xl font-black flex items-center justify-center shadow-lg ${
                isYouTube 
                  ? 'bg-red-600 text-white shadow-red-600/30' 
                  : 'bg-[#00F59B] text-black shadow-[#00F59B]/20'
              }`}
            >
              {isYouTube ? <Youtube className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                Importador de .CSV do {platformName}
              </h2>
              <p className="text-xs text-[#ADADB8]">
                {isYouTube 
                  ? 'Insira o arquivo exportado do YouTube Studio (Analytics ➔ Modo avançado ➔ Ao vivo)'
                  : 'Insira o arquivo exportado do Painel de Controle da Twitch para gerar o dashboard horizontal'}
              </p>
            </div>
          </div>
        </div>

        {/* Status / Quick Action */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleLoadSample}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isYouTube 
                ? 'bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-500/30' 
                : 'bg-[#2D2D35] hover:bg-[#3D3D45] text-white'
            }`}
            title={`Carregar exemplo com dados reais de stream do ${platformName}`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isYouTube ? 'text-red-400' : 'text-[#00F59B]'}`} />
            <span>Carregar Exemplo ({platformName})</span>
          </button>

          <button
            type="button"
            onClick={() => setPasteMode(!pasteMode)}
            className="px-3.5 py-2 rounded-xl bg-[#2D2D35] hover:bg-[#3D3D45] text-xs font-bold text-[#ADADB8] hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>{pasteMode ? 'Ocultar Caixa de Texto' : 'Colar Texto do CSV'}</span>
          </button>
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Drag & Drop Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer select-none relative overflow-hidden group ${
          isDragging
            ? isYouTube
              ? 'border-red-500 bg-red-500/10 scale-[1.01]'
              : 'border-[#00F59B] bg-[#00F59B]/10 scale-[1.01]'
            : isYouTube
              ? 'border-red-900/50 hover:border-red-500 bg-[#0E0E10]'
              : 'border-[#3D3D45] hover:border-[#00F59B] bg-[#0E0E10]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-3">
          <div 
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform ${
              isYouTube 
                ? 'bg-red-600/15 text-red-500' 
                : 'bg-[#00F59B]/15 text-[#00F59B]'
            }`}
          >
            {isYouTube ? <Youtube className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Arraste e solte o arquivo <span className={isYouTube ? 'text-red-400' : 'text-[#00F59B]'}>.CSV</span> do {platformName} aqui
            </h3>
            <p className="text-xs text-[#ADADB8] mt-1">
              ou clique para selecionar do seu computador
            </p>
          </div>

          {currentCount > 0 && (
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18181B] border text-xs font-semibold ${
              isYouTube ? 'border-red-500/40 text-red-400' : 'border-[#2D2D35] text-[#00F59B]'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Arquivo ativo: {currentFileName || 'dados.csv'} ({currentCount} lives carregadas)</span>
            </div>
          )}
        </div>
      </div>

      {/* Paste Mode Area */}
      {pasteMode && (
        <div className="space-y-3 bg-[#0E0E10] p-4 rounded-2xl border border-[#2D2D35]">
          <label className="block text-xs font-bold text-[#ADADB8] uppercase tracking-wider">
            Cole as linhas do arquivo .CSV do {platformName} aqui:
          </label>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={5}
            placeholder={
              isYouTube
                ? 'Data,Visualizações,Espectadores simultâneos médios,Pico de espectadores simultâneos,Participantes do chat...'
                : 'Data,Visualizações ao vivo,Média de espectadores,Espectadores máximos,Participantes únicos do chat...'
            }
            className="w-full p-3 bg-[#18181B] border border-[#2D2D35] focus:border-red-500 rounded-xl text-xs font-mono text-white placeholder-[#70707B] outline-none"
          />
          <button
            type="button"
            onClick={handleProcessPastedText}
            className={`py-2.5 px-5 rounded-xl font-bold text-xs transition-all active:scale-95 ${
              isYouTube
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-[#00F59B] hover:bg-[#00D687] text-black'
            }`}
          >
            Processar Texto do CSV
          </button>
        </div>
      )}

      {/* Helpful instructions on how to get the CSV */}
      {isYouTube ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#0E0E10] border border-[#26262C] space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">1</span>
              Acesse o YouTube Studio
            </p>
            <p className="text-[#ADADB8] text-[11px]">
              Vá em <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="text-red-400 underline">studio.youtube.com</a> ➔ <strong>Estatísticas</strong> (Analytics).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0E0E10] border border-[#26262C] space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">2</span>
              Modo Avançado ➔ Ao vivo
            </p>
            <p className="text-[#ADADB8] text-[11px]">
              Clique em <strong>Modo avançado</strong> no canto superior direito e filtre por <strong>Ao vivo</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0E0E10] border border-[#26262C] space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">3</span>
              Exportar (.CSV)
            </p>
            <p className="text-[#ADADB8] text-[11px]">
              Clique no botão de exportação e selecione <strong>Valores separados por vírgula (.csv)</strong>.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#0E0E10] border border-[#26262C] space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#9146FF] text-white flex items-center justify-center text-[10px]">1</span>
              Acesse o Painel da Twitch
            </p>
            <p className="text-[#ADADB8] text-[11px]">
              Vá em <a href="https://dashboard.twitch.tv/analytics" target="_blank" rel="noreferrer" className="text-[#BF94FF] underline">dashboard.twitch.tv</a> ➔ <strong>Estatísticas</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0E0E10] border border-[#26262C] space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#9146FF] text-white flex items-center justify-center text-[10px]">2</span>
              Resumo da Live / Análise
            </p>
            <p className="text-[#ADADB8] text-[11px]">
              Selecione a data ou período desejado no menu de estatísticas do canal.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0E0E10] border border-[#26262C] space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#00F59B] text-black flex items-center justify-center text-[10px]">3</span>
              Clique em &quot;Exportar dados&quot;
            </p>
            <p className="text-[#ADADB8] text-[11px]">
              Baixe o arquivo <strong>.CSV</strong> gerado pela Twitch e solte-o no painel acima.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
