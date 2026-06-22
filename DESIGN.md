# Design

## Visual Theme
Sistem desain menggunakan pendekatan estetik terstruktur yang mencerminkan kekokohan industri beton dengan kebersihan antarmuka modern.

## Color Palette (OKLCH)
Seluruh warna dasar didefinisikan menggunakan ruang warna OKLCH untuk menjamin akurasi kontras tinggi dan adaptasi visual yang optimal.

### Light Theme
- **Latar Belakang Utama (`--background`):** `oklch(0.98 0.005 240)` — Abu-abu semen terang yang bersih, bukan krem/kertas hangat.
- **Teks Utama (`--foreground`):** `oklch(0.22 0.01 240)` — Slate ink gelap untuk kontras membaca maksimal ($\ge 4.5:1$).
- **Latar Belakang Kartu (`--card`):** `oklch(1 0 0)` — Putih murni.
- **Warna Border (`--border`):** `oklch(0.92 0.005 240)` — Batas slate tipis.
- **Warna Muted (`--muted-foreground`):** `oklch(0.55 0.01 240)` — Keterbacaan yang tetap tinggi ($\ge 4.5:1$).

### Dark Theme
- **Latar Belakang Utama (`--background`):** `oklch(0.14 0.015 240)` — Premium dark slate.
- **Teks Utama (`--foreground`):** `oklch(0.96 0.005 240)` — Perak terang/silver off-white.
- **Latar Belakang Kartu (`--card`):** `oklch(0.18 0.012 240)` — Slate gelap padat.
- **Warna Border (`--border`):** `oklch(0.28 0.01 240)` — Batas gelap tipis.
- **Warna Muted (`--muted-foreground`):** `oklch(0.68 0.008 240)` — Abu-abu kontras tinggi untuk teks penjelas.

### Shared Colors
- **Primary Brand (`--primary`):** `oklch(0.48 0.14 152)` — Kalla Group Emerald Green.
- **Primary Hover:** `oklch(0.43 0.13 152)`
- **Accent Color (`--accent`):** `oklch(0.62 0.17 195)` — Teal/cyan untuk aksen data interaktif.
- **Danger Color (`--danger`):** `oklch(0.60 0.18 25)` — Red solid.
- **Warning Color (`--warning`):** `oklch(0.78 0.16 80)` — Amber solid.
- **Success Color (`--success`):** `oklch(0.62 0.16 140)` — Green solid.

## Typography
- **Font Stack:** Sistem Sans-Serif (`Geist Sans`, system-ui, sans-serif) yang dioptimalkan untuk keterbacaan data numerik.
- **Line Length:** Panjang baris teks deskriptif dibatasi maksimal 65–75ch untuk kenyamanan mata.
- **Text Wrap:** Menggunakan `text-wrap: balance` untuk seluruh heading utama (h1-h3) dan `text-wrap: pretty` untuk teks paragraf.

## Layout & Rhythm
- **Sistem Grid:** Layout dua dimensi menggunakan CSS Grid tanpa breakpoint tetap: `repeat(auto-fit, minmax(280px, 1fr))`.
- **Rhythm Spacing:** Skala kelipatan 4px/8px (`gap-4` = 16px, `gap-6` = 24px, `p-6` = 24px) untuk keselarasan vertikal dan horisontal.
- **Semantic Z-Index Scale:**
  - Dropdown: `10`
  - Sticky element: `20`
  - Modal backdrop: `30`
  - Modal window: `40`
  - Toast notification: `50`
  - Tooltip: `60`

## Motion & Transitions
- **Fungsi Transisi:** Menggunakan kurva eksponensial `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) untuk animasi transisi halaman/dialog yang halus.
- **Aksesibilitas Gerak:** Seluruh animasi harus menghormati `@media (prefers-reduced-motion: reduce)` dengan beralih ke transisi cross-fade instan.
