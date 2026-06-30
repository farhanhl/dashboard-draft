'use client';

import { useState, useTransition } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  X, 
  RefreshCw, 
  CheckSquare, 
  Square,
  AlertCircle 
} from 'lucide-react';
import { saveSurveyKepuasanAction, deleteSurveyKepuasanAction } from '@/app/actions/checklists';

interface SurveyKepuasanTableProps {
  data: any[];
  isQA: boolean;
  petugasList: string[];
}

export function SurveyKepuasanTable({ data, isQA, petugasList }: SurveyKepuasanTableProps) {
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [formPetugasName, setFormPetugasName] = useState('');
  const [formYear, setFormYear] = useState(new Date().getFullYear().toString());
  const [errorMessage, setErrorMessage] = useState('');

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
        alert(res.error);
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

    // Check if already exists for this year
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
              placeholder="Cari petugas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-slate-800"
            />
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-slate-700 font-semibold"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>Tahun {year}</option>
            ))}
          </select>
        </div>

        {isQA && (
          <button
            onClick={() => {
              setFormPetugasName(petugasList[0] || '');
              setFormYear(selectedYear);
              setErrorMessage('');
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1E3A8A] hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Checklist
          </button>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-6 py-4">Nama Petugas</th>
                {monthLabels.map(m => (
                  <th key={m} className="px-3 py-4 text-center">{m}</th>
                ))}
                {isQA && <th className="px-6 py-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredData.length > 0 ? (
                filteredData.map((row) => (
                  <tr key={row.__rowIndex} className="hover:bg-slate-50/50 transition-colors">
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
                  <td colSpan={14} className="text-center py-10 text-slate-400">
                    Tidak ada data checklist survey kepuasan untuk tahun {selectedYear}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isQA && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-2.5 text-xs text-slate-500 font-semibold">
          <AlertCircle className="w-4.5 h-4.5 text-[#1E3A8A] shrink-0" />
          <span>Sebagai QA, Anda dapat melakukan checklist langsung pada tabel dengan mengeklik ikon kotak di atas.</span>
        </div>
      )}

      {/* Add Checklist Modal */}
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
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1E3A8A] hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
                >
                  {isPending && <RefreshCw className="w-3 animate-spin" />}
                  Tambah Baris
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
