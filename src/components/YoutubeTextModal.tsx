import React, { useState } from 'react';
import { 
  X, 
  ClipboardPaste, 
  FileText, 
  Sparkles, 
  AlertCircle, 
  Upload, 
  Check 
} from 'lucide-react';
import { SAMPLE_YOUTUBE_TEXT, parseYoutubeCsvText } from '../utils/youtubeParser';
import { YoutubeParseResult } from '../types/youtube';

interface YoutubeTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataParsed: (result: YoutubeParseResult) => void;
}

export const YoutubeTextModal: React.FC<YoutubeTextModalProps> = ({
  isOpen,
  onClose,
  onDataParsed,
}) => {
  const [text, setText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProcess = () => {
    if (!text.trim()) {
      setErrorMessage('Por favor, cole o conteúdo do .CSV do YouTube.');
      return;
    }

    try {
      const result = parseYoutubeCsvText(text);
      if (result.lives.length === 0) {
        setErrorMessage('Não foi possível identificar linhas de transmissão válidas no texto colado.');
        return;
      }
      onDataParsed(result);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar os dados do YouTube.');
    }
  };

  const handleLoadSample = () => {
    setText(SAMPLE_YOUTUBE_TEXT);
    setErrorMessage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setText(content);
        setErrorMessage(null);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#18181B] border border-[#2D2D35] rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2D2D35] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF0000] text-white flex items-center justify-center font-black shadow-lg shadow-[#FF0000]/25">
              <ClipboardPaste className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Importar Dados do YouTube (.CSV em Texto)</h3>
              <p className="text-xs text-[#ADADB8]">
                Cole o texto com as colunas do YouTube Studio
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

        {/* Error message */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-[#EFEFF1]">
              Conteúdo do CSV:
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-[#FF4E45] hover:text-[#FF0000] font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Carregar Exemplo</span>
              </button>
              <label className="text-[#ADADB8] hover:text-white cursor-pointer font-medium flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                <span>Carregar arquivo</span>
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`"Título da Live,Data de Publicação,Visualizações Totais,Média de Espectadores Simultâneos,Pico de Espectadores Simultâneos,Mensagens no Chat,Reações ao Vivo
"Ragnarok LATAM - MANUTENÇÃO 01/09",2026-09-01,4676,239,315,792,2
...`}
            rows={10}
            className="w-full p-4 bg-[#0E0E10] border border-[#2D2D35] focus:border-[#FF0000] rounded-2xl text-xs font-mono text-white placeholder-[#50505A] outline-none transition-all resize-y"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#2D2D35]">
          <span className="text-[11px] text-[#70707B]">
            Suporta texto com aspas duplas e "Em processamento"
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#26262C] hover:bg-[#32323A] text-white text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleProcess}
              className="px-5 py-2 rounded-xl bg-[#FF0000] hover:bg-[#CC0000] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-[#FF0000]/25"
            >
              <Check className="w-4 h-4" />
              <span>Processar Lives</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
