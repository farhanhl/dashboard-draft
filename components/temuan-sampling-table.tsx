'use client';

import { useState, useTransition, useRef } from 'react';
import { 
  Search, 
  Download, 
  Upload,
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveTemuanSamplingAction, deleteTemuanSamplingAction, deleteTemuanSamplingsAction, importTemuanSamplingAction } from '@/app/actions/temuan';
import { fetchSheetCsv } from '@/lib/googleSheetHelper';

interface TemuanSamplingTableProps {
  data: any[];
  isQA: boolean;
  petugasList: string[];
}

export function TemuanSamplingTable({ data, isQA, petugasList }: TemuanSamplingTableProps) {
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('ALL');
  const [sortField, setSortField] = useState('tanggal_sampling');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // Import State & Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [showSheetModal, setShowSheetModal] = useState(false);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const processImportRows = (json: any[]): any[] => {
    return json.map(row => {
      const mapped: any = {};
      
      const petugasKey = Object.keys(row).find(k => 
        k.toLowerCase() === 'nama petugas' || 
        k.toLowerCase() === 'petugas_name' || 
        k.toLowerCase() === 'nama' ||
        k.toLowerCase() === 'petugas'
      );
      mapped.petugas_name = petugasKey ? String(row[petugasKey]).trim() : '';

      const tglTransKey = Object.keys(row).find(k => 
        k.toLowerCase() === 'tanggal transaksi' || 
        k.toLowerCase() === 'tanggal_transaksi' ||
        k.toLowerCase() === 'tgl transaksi'
      );
      mapped.tanggal_transaksi = tglTransKey ? String(row[tglTransKey]).trim() : '';

      const tglSampKey = Object.keys(row).find(k => 
        k.toLowerCase() === 'tanggal sampling' || 
        k.toLowerCase() === 'tanggal_sampling' ||
        k.toLowerCase() === 'tgl sampling'
      );
      mapped.tanggal_sampling = tglSampKey ? String(row[tglSampKey]).trim() : '';

      const weekKey = Object.keys(row).find(k => 
        k.toLowerCase() === 'pekan (week)' || 
        k.toLowerCase() === 'pekan' ||
        k.toLowerCase() === 'week'
      );
      mapped.week = weekKey ? String(row[weekKey]).trim() : '1';

      // Indicators
      const indicatorsMap: Record<string, string[]> = {
        etika_salam: ['salam pembuka', 'etika_salam'],
        etika_ramah: ['sopan santun', 'etika_ramah'],
        etika_bahasa: ['tata bahasa', 'etika_bahasa'],
        keterampilan_menulis: ['keterampilan menulis', 'keterampilan_menulis'],
        keterampilan_analisis: ['keterampilan analisis', 'keterampilan_analisis'],
        prosedur_informasi: ['kesesuaian informasi', 'prosedur_informasi'],
        prosedur_proses: ['kesesuaian prosedur', 'prosedur_proses'],
        prosedur_tiket: ['kesesuaian tiket', 'prosedur_tiket']
      };

      Object.entries(indicatorsMap).forEach(([dbField, aliases]) => {
        const rowKey = Object.keys(row).find(k => 
          aliases.includes(k.toLowerCase())
        );
        if (rowKey !== undefined) {
          const valStr = String(row[rowKey]).trim().toUpperCase();
          if (valStr === 'N/A') {
            mapped[dbField] = 'N/A';
          } else {
            const numVal = parseInt(valStr);
            if (!isNaN(numVal) && numVal >= 0 && numVal <= 3) {
              mapped[dbField] = String(numVal);
            } else {
              mapped[dbField] = '3';
            }
          }
        } else {
          mapped[dbField] = '3';
        }
      });

      const temuanKey = Object.keys(row).find(k => 
        k.toLowerCase() === 'temuan' ||
        k.toLowerCase() === 'keterangan temuan'
      );
      mapped.temuan = temuanKey ? String(row[temuanKey]).trim() : '';

      const rekKey = Object.keys(row).find(k => 
        k.toLowerCase() === 'rekomendasi' ||
        k.toLowerCase() === 'rekomendasi / rencana aksi'
      );
      mapped.rekomendasi = rekKey ? String(row[rekKey]).trim() : '';

      return mapped;
    }).filter(r => r.petugas_name);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const dataBytes = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(dataBytes, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        if (json.length === 0) {
          alert('Spreadsheet kosong.');
          return;
        }

        const mappedRows = processImportRows(json);

        if (mappedRows.length === 0) {
          alert('Tidak ada data petugas yang valid ditemukan.');
          return;
        }

        if (confirm(`Apakah Anda yakin ingin meng-import ${mappedRows.length} data temuan sampling?`)) {
          startTransition(async () => {
            const res = await importTemuanSamplingAction(mappedRows);
            if (res.success) {
              alert(res.message);
            } else {
              alert(res.error);
            }
          });
        }
      } catch (err: any) {
        alert(`Gagal memproses file: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleSheetImport = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const csvData = await fetchSheetCsv(sheetUrl);
        const csvText = new TextDecoder().decode(csvData);
        const workbook = XLSX.read(csvText, { type: 'string' });
        const json = XLSX.utils.sheet_to_json<any>(workbook.Sheets[workbook.SheetNames[0]]);
        const mappedRows = processImportRows(json);

        if (mappedRows.length === 0) {
          alert('Tidak ada data petugas yang valid ditemukan.');
          return;
        }

        const res = await importTemuanSamplingAction(mappedRows);
        if (res.success) {
          alert(res.message);
          setShowSheetModal(false);
        } else {
          alert(res.error);
        }
      } catch (err) {
        alert('Gagal mengambil data dari Google Sheet.');
      }
    });
  };

  // CRUD & Details States
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentEditRow, setCurrentEditRow] = useState<any | null>(null);
  const [currentDetailsRow, setCurrentDetailsRow] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [formPetugasName, setFormPetugasName] = useState('');
  const [formTglTransaksi, setFormTglTransaksi] = useState('');
  const [formTglSampling, setFormTglSampling] = useState('');
  const [formWeek, setFormWeek] = useState('1');
  const [formTemuan, setFormTemuan] = useState('');
  const [formRekomendasi, setFormRekomendasi] = useState('');
  
  // Indicator scores (default '3')
  const [indicators, setIndicators] = useState<Record<string, string>>({
    etika_salam: '3', etika_ramah: '3', etika_bahasa: '3',
    keterampilan_menulis: '3', keterampilan_analisis: '3',
    prosedur_informasi: '3', prosedur_proses: '3', prosedur_tiket: '3'
  });

  // Unique weeks list
  const weeksList = Array.from(new Set(data.map(item => item.week).filter(Boolean)))
    .map(Number)
    .sort((a, b) => a - b);

  // Compute Total score for indicators using new weights and 0,1,2,3,N/A scale
  const calculateTotalScore = (row: any) => {
    const weights: Record<string, number> = {
      etika_salam: 0.05,
      etika_ramah: 0.05,
      etika_bahasa: 0.10,
      keterampilan_menulis: 0.15,
      keterampilan_analisis: 0.15,
      prosedur_informasi: 0.20,
      prosedur_proses: 0.25,
      prosedur_tiket: 0.05,
    };

    let totalWeightedScore = 0;

    Object.entries(weights).forEach(([field, weight]) => {
      const rawVal = row[field];
      let score = 3; // Default to N/A (which is treated as 3)

      if (rawVal !== undefined && rawVal !== null) {
        const valStr = String(rawVal).trim().toUpperCase();
        if (valStr !== 'N/A') {
          const valNum = parseFloat(valStr);
          if (!isNaN(valNum)) {
            score = valNum;
          }
        }
      }

      // Each indicator score is normalized out of 3, then multiplied by its weight
      totalWeightedScore += (score / 3) * weight;
    });

    return Math.round(totalWeightedScore * 100);
  };

  // Filter data
  const filteredData = data.filter(row => {
    const matchesSearch = 
      row.petugas_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.temuan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.rekomendasi?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWeek = selectedWeek === 'ALL' ? true : String(row.week) === selectedWeek;
    return matchesSearch && matchesWeek;
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';

    if (sortField === 'score') {
      aVal = calculateTotalScore(a);
      bVal = calculateTotalScore(b);
    } else if (sortField === 'week') {
      aVal = Number(a.week) || 0;
      bVal = Number(b.week) || 0;
    }

    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  // Paginate
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const visibleRowIndices = paginatedData.map(row => Number(row.__rowIndex));
  const isAllSelected = paginatedData.length > 0 && paginatedData.every(row => selectedRows.includes(Number(row.__rowIndex)));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRows(prev => prev.filter(id => !visibleRowIndices.includes(id)));
    } else {
      setSelectedRows(prev => {
        const newSelections = [...prev];
        visibleRowIndices.forEach(id => {
          if (!newSelections.includes(id)) {
            newSelections.push(id);
          }
        });
        return newSelections;
      });
    }
  };

  const handleSelectRow = (rowIndex: number) => {
    setSelectedRows(prev => 
      prev.includes(rowIndex) 
        ? prev.filter(id => id !== rowIndex) 
        : [...prev, rowIndex]
    );
  };

  const handleBatchDelete = () => {
    if (confirm(`Apakah Anda yakin ingin menghapus ${selectedRows.length} data temuan sampling yang terpilih?`)) {
      startTransition(async () => {
        const res = await deleteTemuanSamplingsAction(selectedRows);
        if (res.success) {
          setSelectedRows([]);
          alert(res.message);
        } else {
          alert(res.error);
        }
      });
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Excel Export
  const handleExport = () => {
    const exportData = sortedData.map(row => ({
      'ID': row.id,
      'Nama Petugas': row.petugas_name,
      'Tanggal Transaksi': row.tanggal_transaksi,
      'Tanggal Sampling': row.tanggal_sampling,
      'Pekan (Week)': row.week,
      'Salam Pembuka': row.etika_salam,
      'Sopan Santun': row.etika_ramah,
      'Tata Bahasa': row.etika_bahasa,
      'Keterampilan Menulis': row.keterampilan_menulis,
      'Keterampilan Analisis': row.keterampilan_analisis,
      'Kesesuaian Informasi': row.prosedur_informasi,
      'Kesesuaian Prosedur': row.prosedur_proses,
      'Kesesuaian Tiket': row.prosedur_tiket,
      'Total Nilai': `${calculateTotalScore(row)}%`,
      'Temuan': row.temuan,
      'Rekomendasi': row.rekomendasi,
      'Tanggal Dibuat': row.created_at,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Temuan Sampling");
    XLSX.writeFile(wb, `Temuan_Sampling_QA_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Add Modal trigger
  const openAddModal = () => {
    setCurrentEditRow(null);
    setFormPetugasName(petugasList[0] || '');
    setFormTglTransaksi(new Date().toISOString().split('T')[0]);
    setFormTglSampling(new Date().toISOString().split('T')[0]);
    setFormWeek('1');
    setFormTemuan('');
    setFormRekomendasi('');
    setIndicators({
      etika_salam: '3', etika_ramah: '3', etika_bahasa: '3',
      keterampilan_menulis: '3', keterampilan_analisis: '3',
      prosedur_informasi: '3', prosedur_proses: '3', prosedur_tiket: '3'
    });
    setErrorMessage('');
    setShowModal(true);
  };

  // Edit Modal trigger
  const openEditModal = (row: any) => {
    setCurrentEditRow(row);
    setFormPetugasName(row.petugas_name || '');
    setFormTglTransaksi(row.tanggal_transaksi || '');
    setFormTglSampling(row.tanggal_sampling || '');
    setFormWeek(String(row.week || 1));
    setFormTemuan(row.temuan || '');
    setFormRekomendasi(row.rekomendasi || '');
    
    const parseScore = (val: any) => {
      if (val === undefined || val === null) return '3';
      const valStr = String(val).trim().toUpperCase();
      return valStr || '3';
    };

    setIndicators({
      etika_salam: parseScore(row.etika_salam),
      etika_ramah: parseScore(row.etika_ramah),
      etika_bahasa: parseScore(row.etika_bahasa),
      keterampilan_menulis: parseScore(row.keterampilan_menulis),
      keterampilan_analisis: parseScore(row.keterampilan_analisis),
      prosedur_informasi: parseScore(row.prosedur_informasi),
      prosedur_proses: parseScore(row.prosedur_proses),
      prosedur_tiket: parseScore(row.prosedur_tiket),
    });
    setErrorMessage('');
    setShowModal(true);
  };

  // Details Modal trigger
  const openDetailsModal = (row: any) => {
    setCurrentDetailsRow(row);
    setShowDetailsModal(true);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formPetugasName) {
      setErrorMessage('Nama petugas wajib dipilih.');
      return;
    }
    if (!formTemuan.trim()) {
      setErrorMessage('Temuan wajib diisi.');
      return;
    }

    const payload: any = {
      petugas_name: formPetugasName,
      tanggal_transaksi: formTglTransaksi,
      tanggal_sampling: formTglSampling,
      week: Number(formWeek),
      temuan: formTemuan.trim(),
      rekomendasi: formRekomendasi.trim(),
      ...indicators
    };

    if (currentEditRow) {
      payload.id = currentEditRow.id;
      payload.created_at = currentEditRow.created_at;
      payload.__rowIndex = currentEditRow.__rowIndex;
    }

    startTransition(async () => {
      const res = await saveTemuanSamplingAction(payload);
      if (res.success) {
        setShowModal(false);
      } else {
        setErrorMessage(res.error || 'Terjadi kesalahan.');
      }
    });
  };

  // Delete Handler
  const handleDelete = (row: any) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data temuan sampling petugas "${row.petugas_name}"?`)) {
      startTransition(async () => {
        const res = await deleteTemuanSamplingAction(row.__rowIndex);
        if (!res.success) {
          alert(res.error);
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari temuan, rekomendasi, petugas..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#BE185D] text-slate-800"
            />
          </div>

          {/* Week Filter */}
          <select
            value={selectedWeek}
            onChange={(e) => { setSelectedWeek(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#BE185D] text-slate-700 font-semibold"
          >
            <option value="ALL">Semua Pekan</option>
            {weeksList.map(week => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
          
          {isQA && (
            <>
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <button
                type="button"
                onClick={handleImportClick}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                Import Excel
              </button>
              <button
                type="button"
                onClick={() => setShowSheetModal(true)}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                Import Spreadsheet
              </button>
              {selectedRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleBatchDelete}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Terpilih ({selectedRows.length})
                </button>
              )}
              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#BE185D] hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Catat Temuan
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {isQA && (
                  <th className="px-4 py-4 text-center w-12">
                    <input 
                      type="checkbox" 
                      checked={isAllSelected} 
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-[#BE185D] focus:ring-[#BE185D] w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('petugas_name')}>
                  Nama Petugas {sortField === 'petugas_name' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="px-4 py-4 text-center cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('week')}>
                  Week {sortField === 'week' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="px-4 py-4 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('tanggal_sampling')}>
                  Tgl Sampling {sortField === 'tanggal_sampling' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="px-4 py-4 text-center cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('score')}>
                  Total Nilai {sortField === 'score' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="px-6 py-4 max-w-xs truncate">Temuan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {paginatedData.length > 0 ? (
                paginatedData.map((row) => {
                  const totalScore = calculateTotalScore(row);
                  return (
                    <tr key={row.__rowIndex} className="hover:bg-slate-50/50 transition-colors">
                      {isQA && (
                        <td className="px-4 py-4 text-center w-12">
                          <input 
                            type="checkbox" 
                            checked={selectedRows.includes(Number(row.__rowIndex))}
                            onChange={() => handleSelectRow(Number(row.__rowIndex))}
                            className="rounded border-slate-300 text-[#BE185D] focus:ring-[#BE185D] w-3.5 h-3.5 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 font-bold text-slate-800">{row.petugas_name}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
                          W-{row.week}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-500">{row.tanggal_sampling}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-[11px] font-extrabold ${
                          totalScore >= 90 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : totalScore >= 75 
                              ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                              : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {totalScore}%
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-slate-500 font-medium">{row.temuan}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetailsModal(row)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
                            title="Detail Indikator"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isQA && (
                            <>
                              <button
                                onClick={() => openEditModal(row)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(row)}
                                className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isQA ? 7 : 6} className="text-center py-10 text-slate-400">
                    Tidak ada data temuan sampling
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-semibold">
              Menampilkan {Math.min(filteredData.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredData.length, currentPage * itemsPerPage)} dari {filteredData.length} data
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details View Modal */}
      {showDetailsModal && currentDetailsRow && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Detail Evaluasi Sampling</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Petugas: {currentDetailsRow.petugas_name} | Week {currentDetailsRow.week}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Info panel */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tgl Transaksi</span>
                  <span className="font-semibold text-slate-700">{currentDetailsRow.tanggal_transaksi || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tgl Sampling</span>
                  <span className="font-semibold text-slate-700">{currentDetailsRow.tanggal_sampling || '-'}</span>
                </div>
              </div>

              {/* Indicators Grouping */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hasil Penilaian Indikator</h4>
                
                {/* 1. Etika Komunikasi */}
                <div className="border border-slate-100 rounded-xl p-3 space-y-2">
                  <h5 className="text-[10px] font-bold text-blue-700 uppercase">Etika Komunikasi</h5>
                  <IndicatorRow label="Salam Pembuka" score={currentDetailsRow.etika_salam} />
                  <IndicatorRow label="Keramahan & Sopan Santun" score={currentDetailsRow.etika_ramah} />
                  <IndicatorRow label="Tata Bahasa & Pemilihan Kata" score={currentDetailsRow.etika_bahasa} />
                </div>

                {/* 2. Keterampilan Pelayanan */}
                <div className="border border-slate-100 rounded-xl p-3 space-y-2">
                  <h5 className="text-[10px] font-bold text-emerald-700 uppercase">Keterampilan Pelayanan</h5>
                  <IndicatorRow label="Kemampuan Menulis/Presentasi" score={currentDetailsRow.keterampilan_menulis} />
                  <IndicatorRow label="Kemampuan Analisis & Verifikasi Data" score={currentDetailsRow.keterampilan_analisis} />
                </div>

                {/* 3. Kesesuaian Solusi & Prosedur */}
                <div className="border border-slate-100 rounded-xl p-3 space-y-2">
                  <h5 className="text-[10px] font-bold text-amber-700 uppercase">Solusi dan Prosedur</h5>
                  <IndicatorRow label="Kesesuaian Informasi" score={currentDetailsRow.prosedur_informasi} />
                  <IndicatorRow label="Kesesuaian Prosedur & Proses Data" score={currentDetailsRow.prosedur_proses} />
                  <IndicatorRow label="Kesesuaian Pelaporan Tiket" score={currentDetailsRow.prosedur_tiket} />
                </div>
              </div>

              {/* Temuan & Rekomendasi */}
              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Keterangan Temuan:</span>
                  <div className="mt-1 bg-slate-50 p-3 rounded-lg text-slate-600 font-medium border border-slate-100 whitespace-pre-wrap">{currentDetailsRow.temuan}</div>
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">Rekomendasi / Saran:</span>
                  <div className="mt-1 bg-blue-50/30 p-3 rounded-lg text-blue-700 font-medium border border-blue-100/50 whitespace-pre-wrap">{currentDetailsRow.rekomendasi || '-'}</div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all shadow-md">
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRUD Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {currentEditRow ? 'Edit Pencatatan Temuan Sampling' : 'Catat Temuan Sampling Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
                    {errorMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Petugas Select */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">Nama Petugas</label>
                    <select
                      value={formPetugasName}
                      onChange={(e) => setFormPetugasName(e.target.value)}
                      className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800 font-semibold"
                    >
                      {petugasList.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Week */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">Week (Pekan)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="52"
                      value={formWeek}
                      onChange={(e) => setFormWeek(e.target.value)}
                      className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                    />
                  </div>

                  {/* Transaksi Date */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">Tanggal Transaksi</label>
                    <input
                      type="date"
                      required
                      value={formTglTransaksi}
                      onChange={(e) => setFormTglTransaksi(e.target.value)}
                      className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                    />
                  </div>

                  {/* Sampling Date */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">Tanggal Sampling</label>
                    <input
                      type="date"
                      required
                      value={formTglSampling}
                      onChange={(e) => setFormTglSampling(e.target.value)}
                      className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                    />
                  </div>
                </div>

                {/* Score inputs */}
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase block mb-3">Nilai Indikator (0 - 100)</h4>
                  
                  <div className="space-y-3">
                    <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-2">
                      <span className="text-[9px] font-bold text-blue-700 uppercase">Etika Komunikasi</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <ScoreInput label="Salam Pembuka" name="etika_salam" val={indicators.etika_salam} set={setIndicators} />
                        <ScoreInput label="Sopan & Ramah" name="etika_ramah" val={indicators.etika_ramah} set={setIndicators} />
                        <ScoreInput label="Tata Bahasa" name="etika_bahasa" val={indicators.etika_bahasa} set={setIndicators} />
                      </div>
                    </div>

                    <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-2">
                      <span className="text-[9px] font-bold text-emerald-700 uppercase">Keterampilan Pelayanan</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <ScoreInput label="Kemampuan Menulis" name="keterampilan_menulis" val={indicators.keterampilan_menulis} set={setIndicators} />
                        <ScoreInput label="Kemampuan Analisis" name="keterampilan_analisis" val={indicators.keterampilan_analisis} set={setIndicators} />
                      </div>
                    </div>

                    <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-2">
                      <span className="text-[9px] font-bold text-amber-700 uppercase">Kesesuaian Prosedur & Solusi</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <ScoreInput label="Kesesuaian Info" name="prosedur_informasi" val={indicators.prosedur_informasi} set={setIndicators} />
                        <ScoreInput label="Kesesuaian Proses" name="prosedur_proses" val={indicators.prosedur_proses} set={setIndicators} />
                        <ScoreInput label="Kesesuaian Tiket" name="prosedur_tiket" val={indicators.prosedur_tiket} set={setIndicators} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Findings & Recommendations */}
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">Keterangan Temuan</label>
                    <textarea
                      required
                      rows={3}
                      value={formTemuan}
                      onChange={(e) => setFormTemuan(e.target.value)}
                      placeholder="Uraikan detail temuan..."
                      className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">Rekomendasi / Solusi</label>
                    <textarea
                      rows={2}
                      value={formRekomendasi}
                      onChange={(e) => setFormRekomendasi(e.target.value)}
                      placeholder="Uraikan rekomendasi tindakan perbaikan..."
                      className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#BE185D] hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
                >
                  {isPending && <RefreshCw className="w-3 animate-spin" />}
                  Simpan Temuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSheetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Import dari Google Spreadsheet</h3>
              <button onClick={() => setShowSheetModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSheetImport}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">URL Google Sheet (public)</label>
                  <input
                    type="text"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    required
                    className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSheetModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#BE185D] hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
                >
                  {isPending && <RefreshCw className="w-3 animate-spin" />}
                  Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Indicator detail row
function IndicatorRow({ label, score }: { label: string; score: any }) {
  const valStr = score !== undefined && score !== null ? String(score).trim().toUpperCase() : 'N/A';
  
  // Define colors based on the value
  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
  if (valStr === '3' || valStr === 'N/A') {
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (valStr === '2') {
    badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (valStr === '1') {
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (valStr === '0') {
    badgeColor = 'bg-red-50 text-red-700 border-red-200';
  }

  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-slate-600 font-medium">{label}</span>
      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${badgeColor}`}>
        {valStr === 'N/A' ? 'N/A' : `${valStr} / 3`}
      </span>
    </div>
  );
}

// Custom input helper for score selection (0, 1, 2, 3, N/A)
function ScoreInput({ label, name, val, set }: { label: string; name: string; val: string; set: any }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500">{label}</label>
      <select
        value={val}
        onChange={(e) => set((prev: any) => ({ ...prev, [name]: e.target.value }))}
        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800 text-center font-bold"
      >
        <option value="3">3</option>
        <option value="2">2</option>
        <option value="1">1</option>
        <option value="0">0</option>
        <option value="N/A">N/A</option>
      </select>
    </div>
  );
}
