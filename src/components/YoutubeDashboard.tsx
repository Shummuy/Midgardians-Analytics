import React, { useState } from 'react';
import { 
  Calendar, 
  Eye, 
  TrendingUp, 
  Flame, 
  MessageSquare, 
  Filter, 
  ArrowUpDown, 
  Download, 
  ClipboardPaste, 
  FileText, 
  Loader2, 
  Check, 
  Youtube,
  Tv
} from 'lucide-react';
import { YoutubeLiveRow } from '../types/youtube';

interface YoutubeDashboardProps {
  lives: YoutubeLiveRow[];
  onOpenPasteModal: () => void;
}

export const YoutubeDashboard: React.FC<YoutubeDashboardProps> = ({
  lives,
  onOpenPasteModal,
}) => {
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'avg' | 'peak' | 'chat'>('date');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [copiedExport, setCopiedExport] = useState(false);

  // Sorting
  const sortedLives = [...lives].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'views') {
      comp = b.totalViews - a.totalViews;
    } else if (sortBy === 'avg') {
      comp = (b.avgViewers || 0) - (a.avgViewers || 0);
    } else if (sortBy === 'peak') {
      comp = (b.peakViewers || 0) - (a.peakViewers || 0);
    } else if (sortBy === 'chat') {
      comp = (b.totalChat || 0) - (a.totalChat || 0);
    } else {
      comp = b.timestamp - a.timestamp;
    }

    return sortDirection === 'desc' ? comp : -comp;
  });

  // Calculate aggregated stats (excluding pending processing rows for valid averages)
  const totalViews = lives.reduce((acc, s) => acc + s.totalViews, 0);

  const completedAvgList = lives.filter((s) => s.avgViewers !== null).map((s) => s.avgViewers as number);
  const overallAvg = completedAvgList.length > 0
    ? Math.round(completedAvgList.reduce((acc, v) => acc + v, 0) / completedAvgList.length)
    : 0;

  const peakList = lives.filter((s) => s.peakViewers !== null).map((s) => s.peakViewers as number);
  const maxPeak = peakList.length > 0 ? Math.max(...peakList) : 0;

  // Chat consolidado (Mensagens + Reações)
  const totalChatCombined = lives.reduce((acc, s) => acc + (s.totalChat || 0), 0);
  const totalChatMessages = lives.reduce((acc, s) => acc + (s.chatMessages || 0), 0);
  const totalReactions = lives.reduce((acc, s) => acc + (s.liveReactions || 0), 0);
  const processingCount = lives.filter((s) => s.isProcessing).length;

  const toggleSort = (field: 'date' | 'views' | 'avg' | 'peak' | 'chat') => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const exportCsv = () => {
    const headers = [
      'Título da Live',
      'Data de Publicação',
      'Visualizações Totais',
      'Média de Espectadores Simultâneos',
      'Pico de Espectadores Simultâneos',
      'Chat (Mensagens + Reações)',
      'Mensagens no Chat',
      'Reações ao Vivo',
    ];

    const rows = sortedLives.map((s) => [
      `"${s.title.replace(/"/g, '""')}"`,
      s.rawDate,
      s.totalViews,
      s.avgViewers !== null ? s.avgViewers : 'Em processamento',
      s.peakViewers !== null ? s.peakViewers : 'Em processamento',
      s.totalChat !== null ? s.totalChat : 'Em processamento',
      s.chatMessages !== null ? s.chatMessages : 'Em processamento',
      s.liveReactions !== null ? s.liveReactions : 'Em processamento',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `youtube_lives_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 4 Summary Metric Cards (Exact 4 Metrics, matching Twitch's sequence) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Visualizações Totais */}
        <div className="bg-[#18181B] border-2 border-[#FF0000]/40 hover:border-[#FF0000] rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF4E45] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF0000] animate-pulse" />
              1. Visualizações Totais
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FF0000]/20 text-[#FF4E45] flex items-center justify-center font-bold">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {totalViews.toLocaleString()}
          </div>
          <div className="text-xs text-[#00F59B] font-semibold mt-2 flex items-center gap-1">
            <span>+{Math.round(totalViews / Math.max(1, lives.length)).toLocaleString()} / live média</span>
          </div>
          <div className="text-[11px] text-[#70707B] mt-0.5">
            Soma de visualizações de todas as lives
          </div>
        </div>

        {/* Card 2: Média Simultânea */}
        <div className="bg-[#18181B] border border-[#2D2D35] hover:border-sky-500/50 rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              2. Média Simultânea
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-sky-300 tracking-tight">
            {overallAvg.toLocaleString()}
          </div>
          <div className="text-xs text-sky-400 font-semibold mt-2">
            Média de espectadores simultâneos
          </div>
          <div className="text-[11px] text-[#70707B] mt-0.5">
            Calculado em {completedAvgList.length} transmissões concluídas
          </div>
        </div>

        {/* Card 3: Pico Simultâneo */}
        <div className="bg-[#18181B] border border-[#2D2D35] hover:border-amber-500/50 rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              3. Pico Simultâneo
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-300 tracking-tight">
            {maxPeak.toLocaleString()}
          </div>
          <div className="text-xs text-amber-300 font-semibold mt-2">
            Recorde de simultâneos ao vivo
          </div>
          <div className="text-[11px] text-[#70707B] mt-0.5">
            Maior pico registrado no período
          </div>
        </div>

        {/* Card 4: Chat (Inclui Mensagens + Reações) */}
        <div className="bg-[#18181B] border border-[#2D2D35] hover:border-[#00F59B]/50 rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00F59B] flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              4. Chat (Total)
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#00F59B]/15 text-[#00F59B] flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#00F59B] tracking-tight">
            {totalChatCombined.toLocaleString()}
          </div>
          <div className="text-xs text-[#00F59B] font-semibold mt-2 flex items-center gap-1">
            <span>{totalChatMessages.toLocaleString()} msgs + {totalReactions.toLocaleString()} reações</span>
          </div>
          <div className="text-[11px] text-[#70707B] mt-0.5">
            Total consolidado de mensagens e reações ao vivo
          </div>
        </div>
      </div>

      {/* Control Bar: Sorting and Actions */}
      <div className="bg-[#18181B] p-4 rounded-2xl border border-[#2D2D35] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-lg">
        {/* Left: Sorting */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#0E0E10] border border-[#2D2D35] rounded-xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#ADADB8]" />
            <span className="text-[#ADADB8]">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer"
            >
              <option value="date" className="bg-[#18181B] text-white">Data de Publicação</option>
              <option value="views" className="bg-[#18181B] text-white">Visualizações Totais</option>
              <option value="avg" className="bg-[#18181B] text-white">Média Simultânea</option>
              <option value="peak" className="bg-[#18181B] text-white">Pico Simultâneo</option>
              <option value="chat" className="bg-[#18181B] text-white">Chat (Mensagens + Reações)</option>
            </select>
            <button
              onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="p-1 hover:text-[#FF4E45] transition-colors ml-1"
              title={sortDirection === 'desc' ? 'Decrescente' : 'Crescente'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {processingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
              {processingCount} live{processingCount > 1 ? 's' : ''} em processamento
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={exportCsv}
            className="px-3.5 py-2 rounded-xl bg-[#2D2D35] hover:bg-[#3D3D45] text-xs font-bold text-white transition-colors flex items-center gap-1.5"
            title="Exportar dados do YouTube em CSV"
          >
            {copiedExport ? <Check className="w-3.5 h-3.5 text-[#00F59B]" /> : <Download className="w-3.5 h-3.5" />}
            <span>{copiedExport ? 'Baixado!' : 'Exportar CSV'}</span>
          </button>

          <button
            onClick={onOpenPasteModal}
            className="px-3.5 py-2 rounded-xl bg-[#FF0000] hover:bg-[#CC0000] text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-[#FF0000]/25"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Colar Texto .CSV</span>
          </button>
        </div>
      </div>

      {/* Header Labels for Horizontal Grid (Exact 4 Metrics, Reações merged into Chat) */}
      <div className="hidden lg:flex items-center justify-between px-6 py-2 text-xs font-bold uppercase tracking-wider text-[#70707B]">
        <div className="flex-1">Data & Transmissão (YouTube)</div>
        <div className="flex items-center gap-4 shrink-0 pr-4">
          <div className="w-[130px] text-center text-[#FF4E45]">1. Visualizações</div>
          <div className="w-[130px] text-center text-sky-400">2. Média Simultânea</div>
          <div className="w-[130px] text-center text-amber-400">3. Pico Simultâneo</div>
          <div className="w-[140px] text-center text-[#00F59B]">4. Chat (Total)</div>
        </div>
      </div>

      {/* Horizontal Live Stream Rows */}
      <div className="space-y-3.5">
        {sortedLives.length === 0 ? (
          <div className="p-12 text-center bg-[#18181B] rounded-2xl border border-[#2D2D35]">
            <Tv className="w-12 h-12 text-[#70707B] mx-auto mb-3" />
            <p className="text-base font-bold text-white">Nenhum dado do YouTube carregado</p>
            <p className="text-xs text-[#ADADB8]">Clique em "Colar Texto .CSV" para importar as transmissões.</p>
          </div>
        ) : (
          sortedLives.map((live) => (
            <div
              key={live.id}
              className="bg-[#18181B] border border-[#2D2D35] hover:border-[#FF0000]/80 rounded-2xl p-4 sm:p-5 shadow-lg transition-all duration-200 hover:shadow-2xl hover:shadow-[#FF0000]/5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 relative overflow-hidden group"
            >
              {/* Left Accent Bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-transparent group-hover:bg-[#FF0000] transition-colors" />

              {/* Left Column: Data da Live e Título */}
              <div className="flex-1 min-w-0 space-y-1.5 pl-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FF0000]/15 text-[#FF4E45] font-bold text-xs border border-[#FF0000]/30">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{live.formattedDate}</span>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#26262C] text-[#EFEFF1] text-xs font-semibold">
                    <Youtube className="w-3 h-3 text-[#FF0000]" />
                    <span>YouTube Live</span>
                  </span>

                  {live.isProcessing && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                      <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                      Em processamento
                    </span>
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-[#FF4E45] transition-colors truncate">
                  {live.title}
                </h3>
              </div>

              {/* Right Columns: EXACT 4 METRICS HORIZONTALLY */}
              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 border-t lg:border-t-0 border-[#26262C] pt-3 lg:pt-0 shrink-0">
                {/* 1. Visualizações Totais */}
                <div className="flex-1 sm:flex-initial w-full sm:w-[130px] p-3 rounded-xl bg-[#0E0E10] border border-[#FF0000]/30 group-hover:border-[#FF0000] text-center transition-colors">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#FF4E45] mb-0.5">
                    <Eye className="w-3.5 h-3.5 text-[#FF0000]" />
                    <span>Visualizações</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white tracking-tight">
                    {live.totalViews.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#70707B] truncate hidden sm:block">
                    Totais
                  </div>
                </div>

                {/* 2. Média Simultânea */}
                <div className="flex-1 sm:flex-initial w-full sm:w-[130px] p-3 rounded-xl bg-[#0E0E10] border border-[#26262C] group-hover:border-sky-500/40 text-center transition-colors">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-sky-400 mb-0.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Média</span>
                  </div>
                  {live.avgViewers !== null ? (
                    <div className="text-lg sm:text-xl font-black text-sky-300 tracking-tight">
                      {live.avgViewers.toLocaleString()}
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-amber-400 py-1 flex items-center justify-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Processando</span>
                    </div>
                  )}
                  <div className="text-[10px] text-[#70707B] truncate hidden sm:block">
                    Simultâneos
                  </div>
                </div>

                {/* 3. Pico Simultâneo */}
                <div className="flex-1 sm:flex-initial w-full sm:w-[130px] p-3 rounded-xl bg-[#0E0E10] border border-[#26262C] group-hover:border-amber-500/40 text-center transition-colors">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Pico</span>
                  </div>
                  {live.peakViewers !== null ? (
                    <div className="text-lg sm:text-xl font-black text-amber-300 tracking-tight">
                      {live.peakViewers.toLocaleString()}
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-amber-400 py-1 flex items-center justify-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Processando</span>
                    </div>
                  )}
                  <div className="text-[10px] text-[#70707B] truncate hidden sm:block">
                    Máximo
                  </div>
                </div>

                {/* 4. Chat (Inclui Mensagens + Reações) */}
                <div className="flex-1 sm:flex-initial w-full sm:w-[140px] p-3 rounded-xl bg-[#0E0E10] border border-[#26262C] group-hover:border-[#00F59B]/40 text-center transition-colors">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#00F59B] mb-0.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat (Total)</span>
                  </div>
                  {live.totalChat !== null ? (
                    <div>
                      <div className="text-lg sm:text-xl font-black text-[#00F59B] tracking-tight">
                        {live.totalChat.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-[#70707B] truncate hidden sm:block">
                        {live.chatMessages ?? 0} msgs • {live.liveReactions ?? 0} reações
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-amber-400 py-1 flex items-center justify-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Processando</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-[#141416] rounded-2xl border border-[#26262C] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#ADADB8]">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#FF0000]" />
          <span>
            Exibindo <strong>{sortedLives.length}</strong> transmissões do YouTube
            {processingCount > 0 ? ` • ${processingCount} com status em processamento` : ''}
          </span>
        </div>
        <div>
          Formato tabular padrão YouTube Studio (.CSV). A coluna de Chat combina mensagens e reações ao vivo.
        </div>
      </div>
    </div>
  );
};
