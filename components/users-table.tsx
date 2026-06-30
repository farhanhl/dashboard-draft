'use client';

import { useState, useTransition } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  RefreshCw,
  Key,
  Shield
} from 'lucide-react';
import { saveUserAction, deleteUserAction, resetPasswordAction } from '@/app/actions/users';

interface UsersTableProps {
  data: any[];
  currentUser: { id: string; email: string; name: string; role: string };
}

export function UsersTable({ data, currentUser }: UsersTableProps) {
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [currentEditRow, setCurrentEditRow] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form inputs
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('QA');
  const [formPassword, setFormPassword] = useState('');
  
  // Reset password inputs
  const [resetUserRow, setResetUserRow] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Filter
  const filteredData = data.filter(row => {
    return (
      row.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Open Add Modal
  const openAddModal = () => {
    setCurrentEditRow(null);
    setFormEmail('');
    setFormName('');
    setFormRole('QA');
    setFormPassword('');
    setErrorMessage('');
    setShowModal(true);
  };

  // Open Edit Modal
  const openEditModal = (row: any) => {
    setCurrentEditRow(row);
    setFormEmail(row.email || '');
    setFormName(row.name || '');
    setFormRole(row.role || 'QA');
    setFormPassword('');
    setErrorMessage('');
    setShowModal(true);
  };

  // Open Reset Modal
  const openResetModal = (row: any) => {
    setResetUserRow(row);
    setNewPassword('');
    setErrorMessage('');
    setShowResetModal(true);
  };

  // Submit User Info Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formEmail.trim() || !formName.trim()) {
      setErrorMessage('Email dan Nama wajib diisi.');
      return;
    }

    const payload: any = {
      email: formEmail.trim(),
      name: formName.trim(),
      role: formRole,
    };

    if (formPassword) {
      payload.password = formPassword;
    }

    if (currentEditRow) {
      payload.__rowIndex = currentEditRow.__rowIndex;
    }

    startTransition(async () => {
      const res = await saveUserAction(payload);
      if (res.success) {
        setShowModal(false);
      } else {
        setErrorMessage(res.error || 'Terjadi kesalahan.');
      }
    });
  };

  // Submit Reset Password Form
  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newPassword || newPassword.length < 4) {
      setErrorMessage('Password baru minimal 4 karakter.');
      return;
    }

    startTransition(async () => {
      const res = await resetPasswordAction(Number(resetUserRow.__rowIndex), newPassword);
      if (res.success) {
        setShowResetModal(false);
        alert('Password berhasil di-reset.');
      } else {
        setErrorMessage(res.error || 'Terjadi kesalahan.');
      }
    });
  };

  // Delete User
  const handleDelete = (row: any) => {
    if (currentUser.id === row.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.');
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus pengguna "${row.name}" (${row.email})?`)) {
      startTransition(async () => {
        const res = await deleteUserAction(Number(row.__rowIndex), row.id);
        if (!res.success) {
          alert(res.error);
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-2.5 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari user (nama, email)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-slate-800"
          />
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1E3A8A] hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-all shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah QA User
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-6 py-4">Nama Pengguna</th>
                <th className="px-4 py-4">Email</th>
                <th className="px-4 py-4 text-center">Role</th>
                <th className="px-4 py-4">Tgl Terdaftar</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredData.length > 0 ? (
                filteredData.map((row) => (
                  <tr key={row.__rowIndex} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-850 flex items-center gap-2">
                      {row.name}
                      {currentUser.id === row.id && (
                        <span className="inline-block text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border leading-none font-bold">
                          Aktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-500 font-medium">{row.email}</td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                        <Shield className="w-3 h-3" />
                        {row.role || 'QA'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500 font-medium">
                      {row.created_at ? new Date(row.created_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openResetModal(row)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(row)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          disabled={currentUser.id === row.id}
                          className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                          title="Hapus User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    Tidak ada data pengguna
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD User Info Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {currentEditRow ? 'Edit Informasi Pengguna' : 'Tambah Pengguna QA Baru'}
              </h3>
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
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Nama Pengguna"
                    className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="email@qa.com"
                    className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">Akses Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-850 font-semibold"
                  >
                    <option value="QA">QA Administrator</option>
                  </select>
                </div>

                {/* Password field (only for new user or if QA wants to reset it here) */}
                {!currentEditRow && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase block">Password Awal</label>
                    <input
                      type="password"
                      required={!currentEditRow}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Minimal 4 karakter"
                      className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                    />
                  </div>
                )}
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
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && resetUserRow && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Reset Password User</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">{resetUserRow.name} ({resetUserRow.email})</p>
              </div>
              <button onClick={() => setShowResetModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit}>
              <div className="p-6 space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
                    {errorMessage}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">Password Baru</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
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
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
