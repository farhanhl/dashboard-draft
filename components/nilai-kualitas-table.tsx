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
  RefreshCw 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveNilaiKualitasAction, deleteNilaiKualitasAction, importNilaiKualitasAction } from '@/app/actions/nilai-kualitas';

interface NilaiKualitasTableProps {
  data: any[];
  isQA: boolean;
}

export function NilaiKualitasTable({ data, isQA }: NilaiKualitasTableProps) {
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [sortField, setSortField] = useState('petugas_name');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Import State & Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
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

        const mappedRows = json.map(row => {
          const mapped: any = {};
          
          const petugasKey = Object.keys(row).find(k => 
            k.toLowerCase() === 'nama petugas' || 
            k.toLowerCase() === 'petugas_name' || 
            k.toLowerCase() === 'nama' ||
            k.toLowerCase() === 'petugas'
          );
          mapped.petugas_name = petugasKey ? String(row[petugasKey]).trim() : '';

          const yearKey = Object.keys(row).find(k => 
            k.toLowerCase() === 'tahun' || 
            k.toLowerCase() === 'year'
          );
          mapped.year = yearKey ? String(row[yearKey]).trim() : new Date().getFullYear().toString();

          const monthMapping: Record<string, string[]> = {
            jan: ['jan', 'januari', 'january'],
            feb: ['feb', 'februari', 'february'],
            mar: ['mar', 'maret', 'march'],
            apr: ['apr', 'april'],
            may: ['mei', 'may'],
            jun: ['jun', 'juni', 'june'],
            jul: ['jul', 'juli', 'july'],
            aug: ['agu', 'agustus', 'august', 'aug'],
            sep: ['sep', 'september'],
            oct: ['okt', 'oktober', 'october', 'oct'],
            nov: ['nov', 'november'],
            dec: ['des', 'desember', 'december', 'dec']
          };

          Object.entries(monthMapping).forEach(([dbField, aliases]) => {
            const rowKey = Object.keys(row).find(k => 
              aliases.includes(k.toLowerCase())
            );
            if (rowKey !== undefined) {
              const rawVal = String(row[rowKey]).replace('%', '').trim();
              mapped[dbField] = rawVal;
            } else {
              mapped[dbField] = '';
            }
          });

          return mapped;
        }).filter(r => r.petugas_name);

        if (mappedRows.length === 0) {
          alert('Tidak ada data petugas yang valid ditemukan.');
          return;
        }

        if (confirm(`Apakah Anda yakin ingin meng-import ${mappedRows.length} data dari spreadsheet?`)) {
          startTransition(async () => {
            const res = await importNilaiKualitasAction(mappedRows);
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

  // CRUD States
  const [showModal, setShowModal] = useState(false);
  const [currentEditRow, setCurrentEditRow] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Months definition
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  // Form inputs state
  const [formPetugasName, setFormPetugasName] = useState('');
  const [formYear, setFormYear] = useState(new Date().getFullYear().toString());
  const [formScores, setFormScores] = useState<Record<string, string>>({
    jan: '', feb: '', mar: '', apr: '', may: '', jun: '', jul: '', aug: '', sep: '', oct: '', nov: '', dec: ''
  });

  // Unique years in the data for filter dropdown
  const availableYears = Array.from(new Set(data.map(item => item.year).filter(Boolean)))
    .map(String)
    .sort((a, b) => b.localeCompare(a));
  
  if (availableYears.length === 0) {
    availableYears.push(new Date().getFullYear().toString());
  }

  // Calculate Average score for row
  const getAverage = (row: any) => {
    let sum = 0;
    let count = 0;
    months.forEach(m => {
      const val = parseFloat(row[m]);
      if (!isNaN(val) && val > 0) {
        sum += val;
        count++;
      }
    });
    return count > 0 ? (sum / count).toFixed(1) : '-';
  };

  // Filter data
  const filteredData = data.filter(row => {
    const matchesSearch = row.petugas_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = row.year ? String(row.year) === selectedYear : true;
    return matchesSearch && matchesYear;
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';

    // Handle average sorting
    if (sortField === 'average') {
      const avgA = getAverage(a);
      const avgB = getAverage(b);
      aVal = avgA === '-' ? -1 : parseFloat(avgA);
      bVal = avgB === '-' ? -1 : parseFloat(avgB);
    } else if (months.includes(sortField)) {
      aVal = aVal === '' ? -1 : parseFloat(aVal);
      bVal = bVal === '' ? -1 : parseFloat(bVal);
    }

    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  // Paginate data
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
    const exportData = sortedData.map(row => {
      const formatted: any = {
        'Nama Petugas': row.petugas_name,
        'Tahun': row.year,
      };
      months.forEach((m, idx) => {
        formatted[monthLabels[idx]] = row[m] ? `${row[m]}%` : '-';
      });
      formatted['Rata-rata'] = getAverage(row) !== '-' ? `${getAverage(row)}%` : '-';
      return formatted;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Nilai QA ${selectedYear}`);
    XLSX.writeFile(wb, `Nilai_Kualitas_Petugas_${selectedYear}.xlsx`);
  };

  // Open Modal for Add
  const openAddModal = () => {
    setCurrentEditRow(null);
    setFormPetugasName('');
    setFormYear(selectedYear);
    const clearedScores: Record<string, string> = {};
    months.forEach(m => clearedScores[m] = '');
    setFormScores(clearedScores);
    setErrorMessage('');
    setShowModal(true);
  };

  // Open Modal for Edit
  const openEditModal = (row: any) => {
    setCurrentEditRow(row);
    setFormPetugasName(row.petugas_name || '');
    setFormYear(String(row.year || selectedYear));
    const scores: Record<string, string> = {};
    months.forEach(m => scores[m] = row[m] || '');
    setFormScores(scores);
    setErrorMessage('');
    setShowModal(true);
  };

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formPetugasName.trim()) {
      setErrorMessage('Nama petugas wajib diisi.');
      return;
    }

    const payload: any = {
      petugas_name: formPetugasName.trim(),
      year: formYear,
      ...formScores
    };

    if (currentEditRow) {
      payload.__rowIndex = currentEditRow.__rowIndex;
    }

    startTransition(async () => {
      const res = await saveNilaiKualitasAction(payload);
      if (res.success) {
        setShowModal(false);
      } else {
        setErrorMessage(res.error || 'Terjadi kesalahan.');
      }
    });
  };

  // Handle Delete Row
  const handleDelete = (row: any) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data nilai kualitas untuk "${row.petugas_name}"?`)) {
      startTransition(async () => {
        const res = await deleteNilaiKualitasAction(row.__rowIndex);
        if (!res.success) {
          alert(res.error);
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari petugas..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#BE185D] text-slate-800"
            />
          </div>

          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#BE185D] text-slate-700 font-semibold"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>Tahun {year}</option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
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
                onClick={openAddModal}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#BE185D] hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Petugas
              </button>
            </>
          )}
        </div>
      </div>

      {/* Responsive Table Wrapper */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleSort('petugas_name')}
                >
                  Nama Petugas {sortField === 'petugas_name' && (sortAsc ? '▲' : '▼')}
                </th>
                {monthLabels.map((lbl, idx) => (
                  <th 
                    key={lbl} 
                    className="px-3 py-4 text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                    onClick={() => handleSort(months[idx])}
                  >
                    {lbl} {sortField === months[idx] && (sortAsc ? '▲' : '▼')}
                  </th>
                ))}
                <th 
                  className="px-4 py-4 text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleSort('average')}
                >
                  Rata-rata {sortField === 'average' && (sortAsc ? '▲' : '▼')}
                </th>
                {isQA && <th className="px-6 py-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {paginatedData.length > 0 ? (
                paginatedData.map((row) => {
                  const avg = getAverage(row);
                  return (
                    <tr key={row.__rowIndex} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{row.petugas_name}</td>
                      {months.map(m => (
                        <td key={m} className="px-3 py-4 text-center tabular-nums">
                          {row[m] ? (
                            <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${
                              parseFloat(row[m]) >= 90 
                                ? 'text-emerald-700' 
                                : parseFloat(row[m]) >= 75 
                                  ? 'text-amber-700' 
                                  : 'text-red-700'
                            }`}>
                              {row[m]}%
                            </span>
                          ) : '-'}
                        </td>
                      ))}
                      <td className="px-4 py-4 text-center font-bold">
                        {avg !== '-' ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-lg text-[11px] font-extrabold ${
                            parseFloat(avg) >= 90 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : parseFloat(avg) >= 75 
                                ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                : 'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {avg}%
                          </span>
                        ) : '-'}
                      </td>
                      {isQA && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
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
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={15} className="text-center py-10 text-slate-400">
                    Tidak ada data petugas untuk tahun {selectedYear}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
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

      {/* CRUD Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {currentEditRow ? 'Edit Nilai Kualitas' : 'Tambah Petugas Baru'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
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
                  {/* Petugas Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">Nama Petugas</label>
                    <input
                      type="text"
                      required
                      value={formPetugasName}
                      onChange={(e) => setFormPetugasName(e.target.value)}
                      placeholder="Nama Lengkap"
                      className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                    />
                  </div>

                  {/* Year */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">Tahun</label>
                    <input
                      type="number"
                      required
                      value={formYear}
                      onChange={(e) => setFormYear(e.target.value)}
                      className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-3">Nilai Bulanan (%)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {months.map((m, idx) => (
                      <div key={m} className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">{monthLabels[idx]}</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formScores[m]}
                          onChange={(e) => setFormScores(prev => ({ ...prev, [m]: e.target.value }))}
                          placeholder="-"
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800 text-center"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3">Biarkan kosong (-) untuk bulan yang belum dinilai. Nilai diinput dalam persen (0 - 100).</p>
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
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
