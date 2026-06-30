'use client';

import { useState, useTransition } from 'react';
import { 
  Search, 
  Download, 
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
import { saveTemuanEksternalAction, deleteTemuanEksternalAction } from '@/app/actions/temuan';

interface TemuanEksternalTableProps {
  data: any[];
  isQA: boolean;
  petugasList: string[];
}

export function TemuanEksternalTable({ data, isQA, petugasList }: TemuanEksternalTableProps) {
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [sortField, setSortField] = useState('tanggal_temuan');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // CRUD & Details States
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentEditRow, setCurrentEditRow] = useState<any | null>(null);
  const [currentDetailsRow, setCurrentDetailsRow] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [formPetugasName, setFormPetugasName] = useState('');
  const [formKodeTiket, setFormKodeTiket] = useState('');
  const [formTglTemuan, setFormTglTemuan] = useState('');
  const [formSumber, setFormSumber] = useState('');
  const [formRisiko, setFormRisiko] = useState('Sedang');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formRekomendasi, setFormRekomendasi] = useState('');

  // Filter data
  const filteredData = data.filter(row => {
    const matchesSearch = 
      row.petugas_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.kode_tiket?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.sumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.keterangan_temuan?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRisk = selectedRisk === 'ALL' ? true : String(row.risiko).toUpperCase() === selectedRisk.toUpperCase();
    return matchesSearch && matchesRisk;
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';

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
      'Kode Tiket': row.kode_tiket,
      'Tanggal Temuan': row.tanggal_temuan,
      'Sumber': row.sumber,
      'Risiko': row.risiko,
      'Keterangan Temuan': row.keterangan_temuan,
      'Rekomendasi': row.rekomendasi,
      'Tanggal Dibuat': row.created_at,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Temuan Eksternal");
    XLSX.writeFile(wb, `Temuan_Eksternal_QA_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Add Modal
  const openAddModal = () => {
    setCurrentEditRow(null);
    setFormPetugasName(petugasList[0] || '');
    setFormKodeTiket('');
    setFormTglTemuan(new Date().toISOString().split('T')[0]);
    setFormSumber('');
    setFormRisiko('Sedang');
    setFormKeterangan('');
    setFormRekomendasi('');
    setErrorMessage('');
    setShowModal(true);
  };

  // Edit Modal
  const openEditModal = (row: any) => {
    setCurrentEditRow(row);
    setFormPetugasName(row.petugas_name || '');
    setFormKodeTiket(row.kode_tiket || '');
    setFormTglTemuan(row.tanggal_temuan || '');
    setFormSumber(row.sumber || '');
    setFormRisiko(row.risiko || 'Sedang');
    setFormKeterangan(row.keterangan_temuan || '');
    setFormRekomendasi(row.rekomendasi || '');
    setErrorMessage('');
    setShowModal(true);
  };

  // Details Modal
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
    if (!formKodeTiket.trim()) {
      setErrorMessage('Kode tiket wajib diisi.');
      return;
    }
    if (!formKeterangan.trim()) {
      setErrorMessage('Keterangan temuan wajib diisi.');
      return;
    }

    const payload: any = {
      petugas_name: formPetugasName,
      kode_tiket: formKodeTiket.trim(),
      tanggal_temuan: formTglTemuan,
      sumber: formSumber.trim() || 'Eksternal',
      risiko: formRisiko,
      keterangan_temuan: formKeterangan.trim(),
      rekomendasi: formRekomendasi.trim(),
    };

    if (currentEditRow) {
      payload.id = currentEditRow.id;
      payload.created_at = currentEditRow.created_at;
      payload.__rowIndex = currentEditRow.__rowIndex;
    }

    startTransition(async () => {
      const res = await saveTemuanEksternalAction(payload);
      if (res.success) {
        setShowModal(false);
      } else {
        setErrorMessage(res.error || 'Terjadi kesalahan.');
      }
    });
  };

  // Delete Handler
  const handleDelete = (row: any) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data temuan eksternal tiket "${row.kode_tiket}"?`)) {
      startTransition(async () => {
        const res = await deleteTemuanEksternalAction(row.__rowIndex);
        if (!res.success) {
          alert(res.error);
        }
      });
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    const r = String(risk).toUpperCase();
    if (r === 'TINGGI') return 'bg-red-50 text-red-700 border-red-200';
    if (r === 'SEDANG') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
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
              placeholder="Cari tiket, petugas, sumber..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-slate-800"
            />
          </div>

          {/* Risk Filter */}
          <select
            value={selectedRisk}
            onChange={(e) => { setSelectedRisk(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-slate-700 font-semibold"
          >
            <option value="ALL">Semua Risiko</option>
            <option value="TINGGI">Tinggi</option>
            <option value="SEDANG">Sedang</option>
            <option value="RENDAH">Rendah</option>
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
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1E3A8A] hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Catat Temuan
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('kode_tiket')}>
                  Kode Tiket {sortField === 'kode_tiket' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="px-4 py-4 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('petugas_name')}>
                  Nama Petugas {sortField === 'petugas_name' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="px-4 py-4 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('tanggal_temuan')}>
                  Tgl Temuan {sortField === 'tanggal_temuan' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="px-4 py-4 text-center cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('risiko')}>
                  Risiko {sortField === 'risiko' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="px-4 py-4">Sumber</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {paginatedData.length > 0 ? (
                paginatedData.map((row) => (
                  <tr key={row.__rowIndex} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-850 text-blue-700">{row.kode_tiket}</td>
                    <td className="px-4 py-4 font-bold text-slate-800">{row.petugas_name}</td>
                    <td className="px-4 py-4 text-slate-500">{row.tanggal_temuan}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getRiskBadgeColor(row.risiko)}`}>
                        {row.risiko || 'Sedang'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500 font-medium">{row.sumber || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetailsModal(row)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
                          title="Detail Temuan"
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
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Tidak ada data temuan eksternal
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
                <h3 className="text-sm font-bold text-slate-800">Detail Temuan Eksternal</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Tiket: {currentDetailsRow.kode_tiket}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Nama Petugas</span>
                  <span className="font-bold text-slate-800">{currentDetailsRow.petugas_name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tgl Temuan</span>
                  <span className="font-semibold text-slate-700">{currentDetailsRow.tanggal_temuan || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Risiko</span>
                  <span className={`inline-block px-2 py-0.5 mt-0.5 rounded-full border text-[9px] font-bold ${getRiskBadgeColor(currentDetailsRow.risiko)}`}>
                    {currentDetailsRow.risiko || 'Sedang'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Sumber</span>
                  <span className="font-semibold text-slate-700">{currentDetailsRow.sumber || '-'}</span>
                </div>
              </div>

              {/* Temuan & Rekomendasi */}
              <div className="space-y-4 text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Detail Masalah / Temuan:</span>
                  <div className="mt-1 bg-slate-50 p-3 rounded-lg text-slate-600 font-medium border border-slate-100 whitespace-pre-wrap">{currentDetailsRow.keterangan_temuan}</div>
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">Rekomendasi Tindakan:</span>
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
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {currentEditRow ? 'Edit Temuan Eksternal' : 'Catat Temuan Eksternal Baru'}
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

                  {/* Kode Tiket */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">Kode Tiket</label>
                    <input
                      type="text"
                      required
                      value={formKodeTiket}
                      onChange={(e) => setFormKodeTiket(e.target.value)}
                      placeholder="TCK-2026-..."
                      className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                    />
                  </div>

                  {/* Tanggal Temuan */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">Tanggal Temuan</label>
                    <input
                      type="date"
                      required
                      value={formTglTemuan}
                      onChange={(e) => setFormTglTemuan(e.target.value)}
                      className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                    />
                  </div>

                  {/* Risiko Select */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">Risiko</label>
                    <select
                      value={formRisiko}
                      onChange={(e) => setFormRisiko(e.target.value)}
                      className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-850 font-semibold"
                    >
                      <option value="Rendah">Rendah</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Tinggi">Tinggi</option>
                    </select>
                  </div>

                  {/* Sumber Input */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">Sumber Temuan</label>
                    <input
                      type="text"
                      value={formSumber}
                      onChange={(e) => setFormSumber(e.target.value)}
                      placeholder="Contoh: Email Pelanggan, Medsos, Komplain Operasional"
                      className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                    />
                  </div>
                </div>

                {/* Description & Recommendations */}
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">Keterangan Temuan</label>
                    <textarea
                      required
                      rows={4}
                      value={formKeterangan}
                      onChange={(e) => setFormKeterangan(e.target.value)}
                      placeholder="Uraikan detail masalah..."
                      className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">Rekomendasi Tindakan</label>
                    <textarea
                      rows={2}
                      value={formRekomendasi}
                      onChange={(e) => setFormRekomendasi(e.target.value)}
                      placeholder="Uraikan rekomendasi..."
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
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1E3A8A] hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
                >
                  {isPending && <RefreshCw className="w-3 animate-spin" />}
                  Simpan Temuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
