# Product Requirements Document (PRD)
# QA Dashboard TIM 3 (Next.js)

## 1. Overview
Membangun dashboard Quality Assurance berbasis **Next.js** dengan desain korporat, responsive, menggunakan **Google Sheets sebagai database utama** melalui Google Sheets API.

## 2. Goals
- Dashboard publik tanpa login (read-only).
- Login hanya untuk QA.
- QA dapat CRUD, import, export, upload.
- Data tersimpan di Google Sheets.
- Konfigurasi Google dapat diubah dari halaman Google Integration.

## 3. Tech Stack
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Table
- React Hook Form + Zod
- Google Sheets API
- NextAuth/Auth.js (QA login)
- Recharts

## 4. Roles

### Public (Petugas)
Tidak perlu login.
Hak akses:
- Melihat seluruh dashboard
- Search, filter, sorting
- Tidak dapat CRUD

### QA
Login wajib.
Hak akses:
- CRUD seluruh modul
- Import/Export Excel
- Google Integration
- Manajemen User

## 5. Pages
1. Dashboard
2. Nilai Kualitas
3. Temuan Sampling
4. Temuan Eksternal
5. Survey Kepuasan
6. List Ticket Sampling
7. Riwayat Coaching
8. Manajemen User
9. Google Integration
10. Login QA

## 6. Dashboard
Menampilkan KPI:
- Total Petugas
- Rata-rata Nilai
- Total Temuan Sampling
- Total Temuan Eksternal
- Grafik tren bulanan

## 7. Nilai Kualitas
Kolom:
- Nama Petugas
- Januari s/d Desember
- Nilai kualitas layanan tiap bulan

Fitur:
- Search
- Sort
- Filter tahun
- Pagination
- Export Excel

## 8. Temuan Sampling
Field:
- Nama Petugas
- Tanggal Transaksi
- Tanggal Sampling
- Indikator Sampling

Indikator:
### ETIKA KOMUNIKASI
- Salam Pembuka
- Keramahan dan Sopan Santun
- Tata Bahasa & Pemilihan Kata

### KETERAMPILAN PELAYANAN
- Kemampuan Menulis/Presentasi
- Kemampuan Analisis dan Verifikasi Data/Dokumen

### KESESUAIAN SOLUSI DAN PROSEDUR
- Kesesuaian Informasi
- Kesesuaian Prosedur dan Proses Data
- Kesesuaian Pelaporan Tiket

Field lain:
- Temuan
- Rekomendasi

## 9. Temuan Eksternal
Field:
- Nama Petugas
- Kode Tiket
- Tanggal Temuan
- Sumber
- Risiko
- Keterangan Temuan
- Rekomendasi

## 10. Survey Kepuasan
Checklist Januari–Desember per petugas.

## 11. List Ticket Sampling
Checklist kategori ticket per petugas.

## 12. Riwayat Coaching
Field:
- Nama Petugas
- Bulan
- Temuan
- Rekomendasi

## 13. Manajemen User
QA dapat:
- Tambah User
- Edit
- Hapus
- Reset Password

## 14. Google Integration

### Status
- Connected/Disconnected
- Spreadsheet ID
- Spreadsheet Name
- Last Sync

### Konfigurasi
- Spreadsheet ID
- Service Account Email
- Private Key
- Nama Sheet:
  - Config
  - Users
  - Nilai Kualitas
  - Temuan Sampling
  - Temuan Eksternal
  - Survey Kepuasan
  - List Ticket Sampling
  - Riwayat Coaching

### Action
- Test Connection
- Save
- Sync Now
- Import Existing Spreadsheet
- Export Backup

Validasi:
- Spreadsheet ditemukan
- Permission valid
- Seluruh sheet tersedia

## 15. Struktur Google Spreadsheet

- Config
- Users
- Nilai Kualitas
- Temuan Sampling
- Temuan Eksternal
- Survey Kepuasan
- List Ticket Sampling
- Riwayat Coaching

## 16. UI/UX

Gaya:
- Corporate Modern
- Clean
- Minimal
- Tidak menggunakan gradient mencolok
- Radius 8–10px
- Shadow halus

Warna:
- Primary: #1E3A8A
- Secondary: #2563EB
- Success: #16A34A
- Warning: #D97706
- Danger: #DC2626
- Background: #F8FAFC

Font:
- Inter

## 17. Responsive
- Desktop ≥1280px
- Tablet 768–1279px
- Mobile <768px

## 18. Functional Requirements
- CRUD
- Search
- Sorting
- Pagination
- Filter
- Import Excel
- Export Excel
- Loading state
- Empty state
- Error state
- Toast notification
- Confirmation dialog
- Skeleton loading

## 19. Non Functional
- Lighthouse >90
- Responsive
- SEO dasar
- Lazy Loading
- Server Actions
- Type-safe
- Dark mode siap dikembangkan

## 20. Acceptance Criteria
- Dashboard publik read-only.
- Login hanya QA.
- Data tersimpan dan dibaca dari Google Sheets.
- Google Integration dapat mengganti Spreadsheet tanpa ubah kode.
- Semua tabel mendukung pagination, sorting, search, filter.
- UI konsisten bergaya korporat dan responsif.
