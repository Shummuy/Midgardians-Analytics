import React, { useState } from 'react';
import { 
  Calendar, 
  Eye, 
  TrendingUp, 
  Flame, 
  MessageSquare, 
  Clock, 
  Filter, 
  ArrowUpDown, 
  Download,
  FileSpreadsheet,
  Tv,
  Check,
  Edit2,
  CheckCheck
} from 'lucide-react';
import { StreamRow } from '../types/twitch';

interface HorizontalDashboardProps {
  streams: StreamRow[];
  fileName?: string;
  rawHeaders?: string[];
  detectedViewsColumn?: string;
  onUploadNewFile: () => void;
  onUpdateStreamViews?: (streamId: string, newViews: number) => void;
  onSelectViewsColumn?: (colName: string) => void;
}

export const HorizontalDashboard: React.FC<HorizontalDashboardProps> = ({
  streams,
  fileName,
  rawHeaders,
  detectedViewsColumn,
  onUploadNewFile,
  onUpdateStreamViews,
  onSelectViewsColumn,
}) => {
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'avg' | 'peak' | 'chatters'>('date');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [copiedExport, setCopiedExport] = useState(false);
  const [editingStreamId, setEditingStreamId] = useState<string | null>(null);
  const [tempViewsValue, setTempViewsValue] = useState<number>(0);

  // Filter and sort (guaranteeing blank days with no data are removed)
  const filteredStreams = streams
    .filter((stream) => {
      // Must have stream data (exclude blank calendar days with no broadcast)
      return (
        stream.views > 0 ||
        stream.avgViewers > 0 ||
        stream.peakViewers > 0 ||
        stream.uniqueChatters > 0
      );
    })
    .sort((a, b) => {
      let comp = 0;
      if (sortBy === 'views') comp = b.views - a.views;
      else if (sortBy === 'avg') comp = b.avgViewers - a.avgViewers;
      else if (sortBy === 'peak') comp = b.peakViewers - a.peakViewers;
      else if (sortBy === 'chatters') comp = b.uniqueChatters - a.uniqueChatters;
      else {
        const timeA = a.timestamp || (a.dateObj instanceof Date ? a.dateObj.getTime() : new Date(a.dateObj || a.rawDate).getTime()) || 0;
        const timeB = b.timestamp || (b.dateObj instanceof Date ? b.dateObj.getTime() : new Date(b.dateObj || b.rawDate).getTime()) || 0;
        comp = timeB - timeA;
      }

      return sortDirection === 'desc' ? comp : -comp;
    });

  // Consolidated Aggregated Totals in the EXACT 4-metric order:
  const totalViews = filteredStreams.reduce((acc, s) => acc + s.views, 0);
  const overallAvg = filteredStreams.length > 0
    ? Math.round(filteredStreams.reduce((acc, s) => acc + s.avgViewers, 0) / filteredStreams.length)
    : 0;
  const maxPeak = filteredStreams.length > 0
    ? Math.max(...filteredStreams.map((s) => s.peakViewers))
    : 0;
  const totalChatters = filteredStreams.reduce((acc, s) => acc + s.uniqueChatters, 0);

  const toggleSort = (field: 'date' | 'views' | 'avg' | 'peak' | 'chatters') => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const handleStartEditViews = (stream: StreamRow) => {
    setEditingStreamId(stream.id);
    setTempViewsValue(stream.views);
  };

  const handleSaveViews = (streamId: string) => {
    if (onUpdateStreamViews) {
      onUpdateStreamViews(streamId, Number(tempViewsValue) || 0);
    }
    setEditingStreamId(null);
  };

  const exportFilteredCsv = () => {
    const headers = [
      'Data da Live',
      'Visualiz. ao vivo',
      'Media de Views (Ao Vivo)',
      'Pico de Views (Ao Vivo)',
      'Participantes Unicos do Chat',
      'Duracao',
      'Jogo',
      'Titulo',
    ];

    const rows = filteredStreams.map((s) => [
      `"${s.formattedDate} ${s.formattedTime}"`,
      s.views,
      s.avgViewers,
      s.peakViewers,
      s.uniqueChatters,
      `"${s.duration}"`,
      `"${s.game.replace(/"/g, '""')}"`,
      `"${s.title.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resumo_lives_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 4 Consolidated Totals in Exact Requested Sequence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Visualiz. ao Vivo */}
        <div className="bg-[#18181B] border-2 border-[#9146FF]/40 hover:border-[#9146FF] rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#BF94FF] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#9146FF] animate-pulse" />
              1. Visualiz. ao Vivo
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#9146FF]/20 text-[#BF94FF] flex items-center justify-center font-bold">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {totalViews.toLocaleString()}
          </div>
          <div className="text-xs text-[#00F59B] font-semibold mt-2 flex items-center gap-1">
            <span>+{Math.round(totalViews / Math.max(1, filteredStreams.length)).toLocaleString()} / live média</span>
          </div>
          <div className="text-[11px] text-[#70707B] mt-0.5">
            Soma de Visualiz. ao vivo no .CSV
          </div>
        </div>

        {/* Metric 2: Média ao Vivo */}
        <div className="bg-[#18181B] border border-[#2D2D35] hover:border-sky-500/50 rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              2. Média ao Vivo
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
            CCV médio durante as lives
          </div>
        </div>

        {/* Metric 3: Pico ao Vivo */}
        <div className="bg-[#18181B] border border-[#2D2D35] hover:border-amber-500/50 rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              3. Pico ao Vivo
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-300 tracking-tight">
            {maxPeak.toLocaleString()}
          </div>
          <div className="text-xs text-amber-300 font-semibold mt-2">
            Pico máximo registrado
          </div>
          <div className="text-[11px] text-[#70707B] mt-0.5">
            Recorde de espectadores em live
          </div>
        </div>

        {/* Metric 4: Chat Único */}
        <div className="bg-[#18181B] border border-[#2D2D35] hover:border-[#00F59B]/50 rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00F59B]">
              4. Chat Único
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#00F59B]/15 text-[#00F59B] flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#00F59B] tracking-tight">
            {totalChatters.toLocaleString()}
          </div>
          <div className="text-xs text-[#00F59B] font-semibold mt-2">
            Participantes únicos do chat
          </div>
          <div className="text-[11px] text-[#70707B] mt-0.5">
            Total de pessoas que mandaram mensagens
          </div>
        </div>
      </div>

      {/* Control Bar: Sorting, Views Column Selector and Actions (Search and Game buttons removed) */}
      <div className="bg-[#18181B] p-4 rounded-2xl border border-[#2D2D35] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-lg">
        {/* Left Side: Sorting and Views Column Mapping */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Sort field */}
          <div className="flex items-center gap-1.5 bg-[#0E0E10] border border-[#2D2D35] rounded-xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#ADADB8]" />
            <span className="text-[#ADADB8]">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer"
            >
              <option value="date" className="bg-[#18181B] text-white">Data da Live</option>
              <option value="views" className="bg-[#18181B] text-white">Visualiz. ao Vivo</option>
              <option value="avg" className="bg-[#18181B] text-white">Média ao Vivo</option>
              <option value="peak" className="bg-[#18181B] text-white">Pico ao Vivo</option>
              <option value="chatters" className="bg-[#18181B] text-white">Chat Único</option>
            </select>
            <button
              onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="p-1 hover:text-[#00F59B] transition-colors ml-1"
              title={sortDirection === 'desc' ? 'Decrescente' : 'Crescente'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Detected Views Column Selector */}
          {rawHeaders && rawHeaders.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#141416] border border-[#9146FF]/40 rounded-xl px-3 py-2 text-xs">
              <Eye className="w-3.5 h-3.5 text-[#BF94FF]" />
              <span className="text-[#ADADB8] whitespace-nowrap">Coluna Views no .CSV:</span>
              <select
                value={detectedViewsColumn || ''}
                onChange={(e) => onSelectViewsColumn && onSelectViewsColumn(e.target.value)}
                className="bg-transparent text-[#BF94FF] font-bold outline-none cursor-pointer max-w-[170px] truncate"
                title="Coluna do CSV usada para Visualiz. ao Vivo"
              >
                {rawHeaders.map((col) => (
                  <option key={col} value={col} className="bg-[#18181B] text-white">
                    {col}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2 justify-end">
          {/* Export CSV button */}
          <button
            onClick={exportFilteredCsv}
            className="px-3.5 py-2 rounded-xl bg-[#2D2D35] hover:bg-[#3D3D45] text-xs font-bold text-white transition-colors flex items-center gap-1.5"
            title="Exportar dados em CSV"
          >
            {copiedExport ? <Check className="w-3.5 h-3.5 text-[#00F59B]" /> : <Download className="w-3.5 h-3.5" />}
            <span>{copiedExport ? 'Baixado!' : 'Exportar CSV'}</span>
          </button>

          {/* Upload New CSV */}
          <button
            onClick={onUploadNewFile}
            className="px-3.5 py-2 rounded-xl bg-[#00F59B] hover:bg-[#00D687] text-black font-bold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-[#00F59B]/20"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Trocar .CSV</span>
          </button>
        </div>
      </div>

      {/* Header Labels for the Horizontal Strip Grid */}
      <div className="hidden lg:flex items-center justify-between px-6 py-2 text-xs font-bold uppercase tracking-wider text-[#70707B]">
        <div className="flex-1">Data da Live & Transmissão</div>
        <div className="flex items-center gap-4 shrink-0 pr-4">
          <div className="w-[130px] text-center text-[#BF94FF]">1. Visualiz. ao Vivo</div>
          <div className="w-[130px] text-center text-sky-400">2. Média Ao Vivo</div>
          <div className="w-[130px] text-center text-amber-400">3. Pico Ao Vivo</div>
          <div className="w-[130px] text-center text-[#00F59B]">4. Chat Único</div>
        </div>
      </div>

      {/* Horizontal Stream Rows (In Exact Order) */}
      <div className="space-y-3.5">
        {filteredStreams.length === 0 ? (
          <div className="p-12 text-center bg-[#18181B] rounded-2xl border border-[#2D2D35]">
            <Tv className="w-12 h-12 text-[#70707B] mx-auto mb-3" />
            <p className="text-base font-bold text-white">Nenhuma transmissão encontrada</p>
            <p className="text-xs text-[#ADADB8]">Importe um arquivo .CSV com as lives da Twitch.</p>
          </div>
        ) : (
          filteredStreams.map((stream) => (
            <div
              key={stream.id}
              className="bg-[#18181B] border border-[#2D2D35] hover:border-[#00F59B] rounded-2xl p-4 sm:p-5 shadow-lg transition-all duration-200 hover:shadow-2xl hover:shadow-[#00F59B]/5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 relative overflow-hidden group"
            >
              {/* Left Accent Bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-transparent group-hover:bg-[#00F59B] transition-colors" />

              {/* Left Column: Data da Live, Título, Jogo e Duração */}
              <div className="flex-1 min-w-0 space-y-1.5 pl-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Data da Live em destaque */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#00F59B]/15 text-[#00F59B] font-bold text-xs border border-[#00F59B]/30">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{stream.formattedDate}</span>
                    {stream.formattedTime && (
                      <span className="text-white/80 font-mono">({stream.formattedTime})</span>
                    )}
                  </div>

                  <span className="px-2.5 py-0.5 rounded-lg bg-[#26262C] text-[#EFEFF1] text-xs font-semibold">
                    {stream.game}
                  </span>

                  <span className="text-xs text-[#70707B] flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {stream.duration}
                  </span>

                  {stream.isEstimatedViews && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#9146FF]/20 text-[#BF94FF] border border-[#9146FF]/30 font-semibold" title="Coluna de views ausente no CSV; valor calculado com base em audiência simultânea e duração">
                      Estimado p/ Live
                    </span>
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-[#00F59B] transition-colors truncate">
                  {stream.title}
                </h3>
              </div>

              {/* Right Columns: THE EXACT 4 METRICS HORIZONTALLY IN SEQUENCE */}
              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 border-t lg:border-t-0 border-[#26262C] pt-3 lg:pt-0 shrink-0">
                {/* 1. Visualiz. ao Vivo */}
                <div className="flex-1 sm:flex-initial w-full sm:w-[130px] p-3 rounded-xl bg-[#0E0E10] border border-[#9146FF]/30 group-hover:border-[#9146FF] text-center transition-colors relative">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#BF94FF] mb-0.5">
                    <Eye className="w-3.5 h-3.5 text-[#9146FF]" />
                    <span>Visualiz. ao Vivo</span>
                    {onUpdateStreamViews && (
                      <button
                        onClick={() => handleStartEditViews(stream)}
                        className="text-[#70707B] hover:text-white ml-0.5"
                        title="Editar manualmente"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>

                  {editingStreamId === stream.id ? (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <input
                        type="number"
                        value={tempViewsValue}
                        onChange={(e) => setTempViewsValue(Number(e.target.value))}
                        className="w-16 px-1.5 py-0.5 bg-[#18181B] border border-[#9146FF] rounded text-white text-xs font-bold text-center outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveViews(stream.id)}
                        className="p-1 rounded bg-[#00F59B] text-black hover:bg-[#00D687]"
                      >
                        <CheckCheck className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-lg sm:text-xl font-black text-white tracking-tight">
                      {stream.views.toLocaleString()}
                    </div>
                  )}

                  <div className="text-[10px] text-[#70707B] truncate hidden sm:block">
                    ao vivo
                  </div>
                </div>

                {/* 2. Média ao Vivo */}
                <div className="flex-1 sm:flex-initial w-full sm:w-[130px] p-3 rounded-xl bg-[#0E0E10] border border-[#26262C] group-hover:border-sky-500/40 text-center transition-colors">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-sky-400 mb-0.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Média Ao Vivo</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-sky-300 tracking-tight">
                    {stream.avgViewers.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#70707B] truncate hidden sm:block">
                    Simultâneo
                  </div>
                </div>

                {/* 3. Pico ao Vivo */}
                <div className="flex-1 sm:flex-initial w-full sm:w-[130px] p-3 rounded-xl bg-[#0E0E10] border border-[#26262C] group-hover:border-amber-500/40 text-center transition-colors">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Pico Ao Vivo</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-amber-300 tracking-tight">
                    {stream.peakViewers.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#70707B] truncate hidden sm:block">
                    Máximo
                  </div>
                </div>

                {/* 4. Chat Único */}
                <div className="flex-1 sm:flex-initial w-full sm:w-[130px] p-3 rounded-xl bg-[#0E0E10] border border-[#26262C] group-hover:border-[#00F59B]/40 text-center transition-colors">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#00F59B] mb-0.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat Único</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-[#00F59B] tracking-tight">
                    {stream.uniqueChatters.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#70707B] truncate hidden sm:block">
                    Participantes
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Status */}
      <div className="p-4 bg-[#141416] rounded-2xl border border-[#26262C] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#ADADB8]">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-[#00F59B]" />
          <span>
            Exibindo <strong>{filteredStreams.length}</strong> transmissões ativas
            {detectedViewsColumn ? ` • Coluna utilizada no .CSV: "${detectedViewsColumn}"` : ''}
          </span>
        </div>
        <div>
          Dados calculados diretamente do arquivo .CSV oficial da Twitch.
        </div>
      </div>
    </div>
  );
};
