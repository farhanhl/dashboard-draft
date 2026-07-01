'use client';

import { useState, useTransition, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Upload,
  Download,
  Trash2, 
  X, 
  RefreshCw, 
  CheckSquare, 
  Square,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { fetchSheetCsv } from '@/lib/googleSheetHelper';
import { saveSurveyKepuasanAction, deleteSurveyKepuasanAction, deleteSurveyKepuasansAction, importSurveyKepuasanAction } from '@/app/actions/checklists';

interface SurveyKepuasanTableProps {
  data: any[];
  isQA: boolean;
  petugasList: string[];
}

export function SurveyKepuasanTable({ data, isQA, petugasList }: SurveyKepuasanTableProps) {
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [sortField, setSortField] = useState('petugas_name');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // Import State & Ref
  const fileInputRef = useRef<HTMLInputElement>(null);


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
          const valStr = String(row[rowKey]).trim().toLowerCase();
          const isTrue = valStr === 'true' || valStr === '1' || valStr === 'yes' || valStr === 'ya' || valStr === 'y' || valStr === 'v' || valStr === 'x';
          mapped[dbField] = isTrue ? 'TRUE' : 'FALSE';
        } else {
          mapped[dbField] = 'FALSE';
        }
      });

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
          toast.error('Spreadsheet kosong.');
          return;
        }

        const mappedRows = processImportRows(json);

        if (mappedRows.length === 0) {
          toast.error('Tidak ada data petugas yang valid ditemukan.');
          return;
        }

        startTransition(async () => {
          const res = await importSurveyKepuasanAction(mappedRows);
          if (res.success) {
            toast.success(res.message);
          } else {
            toast.error(res.error);
          }
        });
      } catch (err: any) {
        toast.error(`Gagal memproses file: ${err.message}`);
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
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const mappedRows = processImportRows(json);
        
        const res = await importSurveyKepuasanAction(mappedRows);
        if (res.success) {
          toast.success(res.message);
          setShowSheetModal(false);
        } else {
          toast.error(res.error);
        }
      } catch (err) {
        toast.error('Gagal mengambil data dari Google Sheet.');
      }
    });
  };

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [formPetugasName, setFormPetugasName] = useState('');
  const [formYear, setFormYear] = useState(new Date().getFullYear().toString());
  const [errorMessage, setErrorMessage] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');

  // Row currently being toggled
  const [togglingIndex, setTogglingIndex] = useState<number | null>(null);

  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const availableYears = Array.from(new Set(data.map(item => item.year).filter(Boolean)))
    .map(String)
    .sort((a, b) => b.localeCompare(a));
  
  if (availableYears.length === 0) {
    availableYears.push(new Date().getFullYear().toString());
  }

  // Filter
  const filteredData = data.filter(row => {
    const matchesSearch = row.petugas_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = row.year ? String(row.year) === selectedYear : true;
    return matchesSearch && matchesYear;
  });



  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    setCurrentPage(1);
  };

  // Sort
  const sortedData = [...filteredData].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';

    if (months.includes(sortField)) {
      const aBool = aVal === 'TRUE' || aVal === true ? 1 : 0;
      const bBool = bVal === 'TRUE' || bVal === true ? 1 : 0;
      return sortAsc ? aBool - bBool : bBool - aBool;
    }

    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const visibleRowIndices = filteredData.map(row => Number(row.__rowIndex));
  const isAllSelected = filteredData.length > 0 && filteredData.every(row => selectedRows.includes(Number(row.__rowIndex)));

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
    if (confirm(`Apakah Anda yakin ingin menghapus ${selectedRows.length} data checklist survey terpilih?`)) {
      startTransition(async () => {
        const res = await deleteSurveyKepuasansAction(selectedRows);
        if (res.success) {
          setSelectedRows([]);
          toast.success(res.message);
        } else {
          toast.error(res.error);
        }
      });
    }
  };

  // Toggle Checkbox Cell
  const handleToggle = (row: any, month: string) => {
    if (!isQA || isPending) return;

    const rowIndex = Number(row.__rowIndex);
    const currentValue = row[month] === 'TRUE' || row[month] === true;
    const nextValue = !currentValue;

    const updatedRow = {
      ...row,
      [month]: nextValue ? 'TRUE' : 'FALSE'
    };

    setTogglingIndex(rowIndex);
    startTransition(async () => {
      const res = await saveSurveyKepuasanAction(updatedRow);
      setTogglingIndex(null);
      if (!res.success) {
        toast.error(res.error);
      }
    });
  };

  // Add Petugas Checklist Row
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formPetugasName) {
      setErrorMessage('Nama petugas wajib dipilih.');
      return;
    }

    const exists = data.some(
      row => row.petugas_name?.toLowerCase() === formPetugasName.toLowerCase() && String(row.year) === formYear
    );
    if (exists) {
      setErrorMessage(`Petugas sudah memiliki baris checklist untuk tahun ${formYear}.`);
      return;
    }

    const payload: Record<string, any> = {
      petugas_name: formPetugasName,
      year: formYear,
    };
    months.forEach(m => payload[m] = 'FALSE');

    startTransition(async () => {
      const res = await saveSurveyKepuasanAction(payload);
      if (res.success) {
        setShowModal(false);
      } else {
        setErrorMessage(res.error || 'Terjadi kesalahan.');
      }
    });
  };

  // Delete Row
  const handleDelete = (row: any) => {
    if (confirm(`Apakah Anda yakin ingin menghapus baris checklist survey untuk "${row.petugas_name}"?`)) {
      startTransition(async () => {
        const res = await deleteSurveyKepuasanAction(row.__rowIndex);
        if (!res.success) {
          toast.error(res.error);
        }
      });
    }
  };

  // Export Excel
  const handleExport = () => {
    const exportData = filteredData.map(row => {
      const formatted: any = {
        'Nama Petugas': row.petugas_name,
        'Tahun': row.year,
      };
      months.forEach((m, idx) => {
        formatted[monthLabels[idx]] = row[m] === 'TRUE' || row[m] === true ? 'YA' : 'TIDAK';
      });
      return formatted;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Survey Kepuasan ${selectedYear}`);
    XLSX.writeFile(wb, `Survey_Kepuasan_Petugas_${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari petugas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#BE185D] text-slate-800"
            />
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#BE185D] text-slate-700 font-semibold"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>Tahun {year}</option>
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
                onClick={() => {
                  setFormPetugasName(petugasList[0] || '');
                  setFormYear(selectedYear);
                  setErrorMessage('');
                  setShowModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#BE185D] hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Checklist
              </button>
            </>
          )}
        </div>
      </div>

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
                <th 
                  onClick={() => handleSort('petugas_name')}
                  className="px-6 py-4 cursor-pointer select-none hover:bg-slate-100/50 transition-colors"
                >
                  Nama Petugas {sortField === 'petugas_name' && (sortAsc ? '▲' : '▼')}
                </th>
                {monthLabels.map((m, idx) => (
                  <th 
                    key={m} 
                    onClick={() => handleSort(months[idx])}
                    className="px-3 py-4 text-center cursor-pointer select-none hover:bg-slate-100/50 transition-colors"
                  >
                    {m} {sortField === months[idx] && (sortAsc ? '▲' : '▼')}
                  </th>
                ))}
                {isQA && <th className="px-6 py-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {paginatedData.length > 0 ? (
                paginatedData.map((row) => (
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
                    {months.map(m => {
                      const isChecked = row[m] === 'TRUE' || row[m] === true;
                      const isTogglingThisRow = togglingIndex === Number(row.__rowIndex);
                      return (
                        <td key={m} className="px-3 py-4 text-center">
                          <button
                            type="button"
                            disabled={!isQA || isPending}
                            onClick={() => handleToggle(row, m)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isQA 
                                ? 'hover:bg-slate-100 cursor-pointer' 
                                : 'cursor-default'
                            }`}
                          >
                            {isTogglingThisRow ? (
                              <RefreshCw className="w-4 h-4 text-blue-500 animate-spin mx-auto" />
                            ) : isChecked ? (
                              <CheckSquare className="w-4.5 h-4.5 text-emerald-600 fill-emerald-50 mx-auto" />
                            ) : (
                              <Square className="w-4.5 h-4.5 text-slate-300 mx-auto" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                    {isQA && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(row)}
                          className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isQA ? 15 : 13} className="text-center py-10 text-slate-400">
                    Tidak ada data checklist survey kepuasan untuk tahun {selectedYear}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {filteredData.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-[11px] text-slate-500 font-semibold">
              <span>
                Menampilkan {Math.min(filteredData.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredData.length, currentPage * itemsPerPage)} dari {filteredData.length} data
              </span>
              <div className="flex items-center gap-1.5">
                <span>Baris per halaman:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#BE185D] font-bold"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Tambah Baris Checklist Baru</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
                    {errorMessage}
                  </div>
                )}
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
                  Tambah Baris
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
