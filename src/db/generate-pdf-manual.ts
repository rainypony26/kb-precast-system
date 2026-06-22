import jsPDF from "jspdf";
import * as fs from "fs";
import * as path from "path";

class PDFHelper {
  doc: jsPDF;
  y: number;
  margin: number;
  width: number;
  height: number;
  currentPage: number;

  constructor(doc: jsPDF) {
    this.doc = doc;
    this.margin = 20;
    this.y = 25; // start below header
    this.width = 210 - 2 * this.margin; // 170mm
    this.height = 297 - 2 * this.margin; // 257mm
    this.currentPage = 1;
  }

  checkPageBreak(h: number) {
    if (this.y + h > 297 - this.margin - 12) { // 12mm buffer at bottom
      this.addNewPage();
    }
  }

  addNewPage() {
    // Draw running header/footer on current page before adding a new one
    this.drawHeaderFooter();
    this.doc.addPage();
    this.currentPage++;
    this.y = 25; // reset Y to start below header
  }

  drawHeaderFooter() {
    const pageNum = this.currentPage;
    if (pageNum > 1) {
      // Header
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(100, 116, 139); // Slate-500
      this.doc.text("Kalla Beton Precast System — Buku Panduan Pengguna (User Manual)", this.margin, 12);
      this.doc.setDrawColor(226, 232, 240); // Slate-200
      this.doc.setLineWidth(0.2);
      this.doc.line(this.margin, 14, 210 - this.margin, 14);

      // Footer
      this.doc.text(`Halaman ${pageNum}`, 210 - this.margin - 16, 285);
      this.doc.text("Kalla Beton Precast Division © 2026", this.margin, 285);
      this.doc.line(this.margin, 281, 210 - this.margin, 281);
    }
  }

  drawCover() {
    // Background card border
    this.doc.setDrawColor(15, 118, 110); // Emerald Green
    this.doc.setLineWidth(1.2);
    this.doc.rect(10, 10, 190, 277);

    // Kalla Beton Vektor Logo
    this.doc.setFillColor(15, 118, 110);
    this.doc.rect(90, 45, 30, 30, "F");
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(18);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text("KB", 100, 64);

    // Company Name
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(26);
    this.doc.setTextColor(15, 118, 110);
    this.doc.text("KALLA BETON", 105, 105, { align: "center" });

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(12);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text("P R E C A S T   S Y S T E M", 105, 113, { align: "center" });

    // Divider Line
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.5);
    this.doc.line(40, 125, 170, 125);

    // Book Title
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(20);
    this.doc.setTextColor(30, 41, 59); // Slate-800
    this.doc.text("BUKU PANDUAN PENGGUNA", 105, 145, { align: "center" });

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(14);
    this.doc.setTextColor(15, 118, 110);
    this.doc.text("ERP & CRM Monitoring, Budgeting & Logistik Precast", 105, 153, { align: "center" });

    // Description text block
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(71, 85, 105);
    const desc = "Buku panduan operasional lengkap dari hulu ke hilir untuk membantu pengguna baru memahami setiap halaman, form, tombol, dan alur integrasi data di dalam platform KB Precast System. Panduan ini menjelaskan langkah demi langkah pembuatan proyek, RAB, SPK, logistik pengadaan PO, pencatatan BKH Cor harian, hingga tinjauan BEP eksekutif keuangan.";
    const descLines = this.doc.splitTextToSize(desc, 140);
    this.doc.text(descLines, 105, 170, { align: "center" });

    // Footer Cover Info
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(9);
    this.doc.setTextColor(30, 41, 59);
    this.doc.text("Kredensial Default Akun Penguji:", 45, 218);
    this.doc.setFont("helvetica", "normal");
    this.doc.text("• Admin   : username (admin)   | password (admin123)", 45, 224);
    this.doc.text("• Manager : username (manager) | password (manager123)", 45, 229);
    this.doc.text("• Staff      : username (staff)     | password (staff123)", 45, 234);

    // Metadata
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text("Versi Dokumentasi: 1.0 (Stabil - Tanpa Gambar)", 105, 255, { align: "center" });
    this.doc.text("Terakhir Diperbarui: 22 Juni 2026", 105, 261, { align: "center" });
    this.doc.text("Kalla Beton Precast Division © 2026", 105, 267, { align: "center" });
  }

  addHeading1(text: string) {
    this.checkPageBreak(18);
    this.y += 4;
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(13);
    this.doc.setTextColor(15, 118, 110); // Emerald Green
    this.doc.text(text, this.margin, this.y);
    this.doc.setDrawColor(15, 118, 110);
    this.doc.setLineWidth(0.4);
    this.doc.line(this.margin, this.y + 2, 210 - this.margin, this.y + 2);
    this.y += 8;
  }

  addHeading2(text: string) {
    this.checkPageBreak(12);
    this.y += 2;
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10);
    this.doc.setTextColor(30, 41, 59); // Slate-800
    this.doc.text(text, this.margin, this.y);
    this.y += 5.5;
  }

  addParagraph(text: string) {
    const lines = this.doc.splitTextToSize(text, this.width);
    const h = lines.length * 4.5;
    this.checkPageBreak(h + 2);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(71, 85, 105); // Slate-600
    this.doc.text(lines, this.margin, this.y);
    this.y += h + 2;
  }

  addBullet(title: string, desc: string) {
    const fullText = `•  ${title}: ${desc}`;
    const lines = this.doc.splitTextToSize(fullText, this.width - 5);
    const h = lines.length * 4.5;
    this.checkPageBreak(h + 1);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text(lines[0], this.margin, this.y);
    if (lines.length > 1) {
      this.doc.text(lines.slice(1), this.margin + 3, this.y + 4.5);
    }
    this.y += h + 1;
  }

  addCallout(text: string, type: "note" | "warning" = "note") {
    const lines = this.doc.splitTextToSize(text, this.width - 10);
    const h = lines.length * 4.5 + 6;
    this.checkPageBreak(h + 2);

    if (type === "warning") {
      this.doc.setFillColor(254, 242, 242); // Red-50
      this.doc.setDrawColor(248, 113, 113); // Red-400
    } else {
      this.doc.setFillColor(240, 253, 250); // Mint-50
      this.doc.setDrawColor(45, 212, 191); // Mint-400
    }
    this.doc.setLineWidth(0.3);
    this.doc.rect(this.margin, this.y, this.width, h, "FD");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(8);
    if (type === "warning") {
      this.doc.setTextColor(220, 38, 38);
      this.doc.text("🚨 PERINGATAN PENTING:", this.margin + 5, this.y + 4.5);
    } else {
      this.doc.setTextColor(13, 148, 136);
      this.doc.text("💡 CATATAN INFORMASI:", this.margin + 5, this.y + 4.5);
    }

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text(lines, this.margin + 5, this.y + 9.5);

    this.y += h + 2;
  }

  drawTableRow(cols: string[], colWidths: number[], isHeader = false) {
    const cellPadding = 2;
    const rowHeight = 9;
    this.checkPageBreak(rowHeight);

    if (isHeader) {
      this.doc.setFillColor(15, 118, 110); // Emerald Green
      this.doc.rect(this.margin, this.y, this.width, rowHeight, "F");
    } else {
      this.doc.setFillColor(248, 250, 252); // Slate-50
      this.doc.rect(this.margin, this.y, this.width, rowHeight, "F");
      this.doc.setDrawColor(226, 232, 240);
      this.doc.setLineWidth(0.2);
      this.doc.line(this.margin, this.y + rowHeight, this.margin + this.width, this.y + rowHeight);
    }

    let x = this.margin;
    for (let i = 0; i < cols.length; i++) {
      const text = cols[i];
      const w = colWidths[i];
      this.doc.setFont("helvetica", isHeader ? "bold" : "normal");
      this.doc.setFontSize(isHeader ? 7.5 : 7);
      this.doc.setTextColor(isHeader ? 255 : 30, isHeader ? 255 : 41, isHeader ? 255 : 59);

      const lines = this.doc.splitTextToSize(text, w - 2 * cellPadding);
      this.doc.text(lines[0] || "", x + cellPadding, this.y + 6);
      x += w;
    }

    this.y += rowHeight;
  }
}

function generatePDF() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const helper = new PDFHelper(doc);

  // --- HALAMAN 1: COVER ---
  helper.drawCover();

  // --- HALAMAN 2: PENDAHULUAN & USER ROLES ---
  helper.addNewPage();
  helper.addHeading1("1. PENDAHULUAN & HAK AKSES PERAN (USER ROLES)");
  helper.addParagraph(
    "Selamat datang di Kalla Beton Precast System. Platform ERP & CRM ini dirancang khusus untuk mengelola operasional produksi beton precast secara digital, teratur, dan transparan. Demi menjaga akurasi data keuangan serta kelancaran logistik bahan baku, sistem menerapkan pembatasan hak akses yang ketat berdasarkan peran jabatan berikut:"
  );

  helper.addHeading2("A. Admin (Administrator)");
  helper.addParagraph(
    "Memiliki otoritas penuh di seluruh modul sistem. Hanya peran Admin yang dapat mengakses rute '/admin' (Manajemen Akun) untuk membuat pengguna baru, melakukan modifikasi akun karyawan, atau menangguhkan akun. Admin juga berhak menghapus data transaksi jika terjadi kesalahan input yang fatal."
  );

  helper.addHeading2("B. Manager (Kepala Divisi / Project Manager)");
  helper.addParagraph(
    "Memiliki wewenang untuk perencanaan anggaran dan otorisasi pengeluaran keuangan. Hanya Manager yang dapat memberikan persetujuan (approval) terhadap dokumen RAB (Rencana Anggaran Biaya) proyek dan dokumen Purchase Request (PR) bahan baku dari staf lapangan. Manager juga berhak menerbitkan SPK produksi dan meninjau Laporan Eksekutif Keuangan."
  );

  helper.addHeading2("C. Assistant Manager (Wakil Manager)");
  helper.addParagraph(
    "Memiliki hak otorisasi operasional yang setara dengan Manager untuk mempermudah delegasi tugas di lapangan, seperti menerbitkan Surat Perintah Kerja (SPK) produksi dan mengelola detail status gudang."
  );

  helper.addHeading2("D. Staff (Staff Lapangan / Operator Gudang / Quality Control)");
  helper.addParagraph(
    "Merupakan operator harian sistem. Staff bertugas menginput data Buku Kerja Harian (BKH) cor produksi, melakukan aksi inspeksi mutu Quality Control (QC) per unit precast, mencatat logistik pengeluaran alokasi bahan baku, serta menginput nota pengeluaran kas lapangan (operational expenses). Staff secara otomatis diblokir dari menu Laporan Eksekutif Keuangan dan menu Manajemen Akun."
  );

  // --- HALAMAN 3: SIKLUS HIDUP PROYEK & DIAGRAM INTEGRASI ---
  helper.addNewPage();
  helper.addHeading1("2. SIKLUS HIDUP PROYEK & INTEGRASI DATA");
  helper.addParagraph(
    "Untuk memastikan keakuratan laporan keuangan dan stok barang jadi, setiap proyek precast wajib mengikuti alur kerja standar (siklus hidup proyek) di bawah ini. Alur ini menjamin bahwa setiap pengeluaran kas lapangan dapat dibandingkan langsung dengan pagu anggaran RAB secara otomatis."
  );

  helper.addHeading2("Tahapan Siklus Hidup Operasional:");
  helper.addBullet("Tahap 1 - CRM", "Mendaftarkan identitas klien, negosiasi harga (SPH), dan menerbitkan Kontrak Induk Proyek.");
  helper.addBullet("Tahap 2 - Budgeting", "PPIC menyusun RAB detail yang terdiri dari alokasi bahan baku (BOM) dan rencana upah tenaga kerja (Manpower).");
  helper.addBullet("Tahap 3 - Approval", "Manager melakukan review rincian RAB dan menyetujui dokumen tersebut untuk mengaktifkan status anggaran.");
  helper.addBullet("Tahap 4 - Rencana Produksi", "Tim PPIC menerbitkan SPK (Surat Perintah Kerja) produksi dengan mengunci RAB acuan yang telah approved.");
  helper.addBullet("Tahap 5 - Procurement", "Logistik membuat Purchase Order (PO) bahan baku ke Supplier Vendor sesuai kebutuhan BOM RAB.");
  helper.addBullet("Tahap 6 - Gudang Pusat", "Ketika material supplier tiba di pabrik, staf melakukan verifikasi barang masuk untuk otomatis menambah stok.");
  helper.addBullet("Tahap 7 - Monitoring BKH", "Setiap hari cor, operator menginput kuantitas unit cetak GOOD (Barang Jadi) dan REJECT (Cacat).");
  helper.addBullet("Tahap 8 - Quality Control", "Tim QC memeriksa unit precast individual di grid pelacakan untuk menguji kelayakan fisik.");
  helper.addBullet("Tahap 9 - Kas Pengeluaran", "Staf mencatat pengeluaran kas riil lapangan (Buku Kerja Harian Kas) untuk material, upah, atau overhead.");
  helper.addBullet("Tahap 10 - Executive Report", "Direksi memantau gross profit margin proyek, visualisasi BEP target vs realisasi, dan grafik cash flow bulanan.");

  helper.addCallout(
    "Data saldo bahan baku di Gudang Pusat dan kuantitas produk precast di Gudang Barang Jadi tersinkronisasi secara otomatis di latar belakang setiap kali Anda mengklik tombol aksi logistik atau menginput data BKH. Jangan melakukan pencatatan manual di luar sistem agar laporan keuangan akhir tidak selisih.",
    "note"
  );

  // --- HALAMAN 4: CRM & SALES ---
  helper.addNewPage();
  helper.addHeading1("3. MODUL CRM & SALES (KLIEN & KONTRAK)");
  helper.addParagraph(
    "Modul CRM & Sales digunakan untuk mengelola data prospek pelanggan, melacak proses negosiasi Surat Penawaran Harga (SPH), hingga mencatat Kontrak Induk resmi yang ditandatangani oleh klien."
  );

  helper.addHeading2("A. Menu CRM & Sales (Daftar Proyek)");
  helper.addParagraph(
    "Halaman ini menyajikan tabel seluruh proyek konstruksi yang sedang ditawarkan atau sedang berjalan. Setiap baris proyek menampilkan nama proyek, nama pelanggan, nama PIC Kalla Beton, estimasi nilai penawaran, dan tahapan status proyek."
  );

  helper.addHeading2("B. Panduan Tombol Aksi di Halaman CRM:");
  helper.addBullet("Tombol '+ Tambah Proyek Baru'", "Membuka formulir popup untuk mendaftarkan proyek baru. Masukkan Nama Proyek, Nama Pelanggan (Instansi/Klien), PIC Internal, Estimasi Nilai Penawaran (Rupiah), Lokasi, dan Status Proyek. Klik 'Simpan Proyek' untuk mendaftarkan ke database.");
  helper.addBullet("Tombol 'Edit Proyek' (Ikon Pensil)", "Membuka formulir untuk memperbarui identitas proyek atau menaikkan tahapan status proyek (misal dari TENDER menjadi KONTRAK).");
  helper.addBullet("Tombol 'Hapus' (Ikon Sampah)", "Menghapus proyek dari database (hanya diizinkan jika proyek belum memiliki dokumen kontrak terikat).");

  helper.addHeading2("C. Panduan Tab SPH & Kontrak Induk:");
  helper.addParagraph(
    "Klik pada nama proyek di tabel untuk masuk ke halaman Detail Proyek. Halaman ini memiliki dua sub-tab utama:"
  );
  helper.addBullet("Tab Surat Penawaran Harga (SPH)", "Klik tombol 'Buat Dokumen SPH' untuk mencatat nomor SPH, nilai harga penawaran resmi, dan tanggal rilis SPH yang dikirim ke klien.");
  helper.addBullet("Tab Kontrak & Dokumen PO", "Klik tombol 'Buat Kontrak Baru' untuk mencatat nomor kontrak legal. Pilihlah kontrak induk, tentukan Nilai Kontrak (Rupiah), Tanggal Mulai dan Tanggal Selesai Kontrak, serta Catatan Tambahan. Klik 'Simpan Kontrak' untuk mengunci kontrak.");

  helper.addCallout(
    "Setiap kali status proyek diubah menjadi 'KONTRAK' dan nilai kontrak diinput, sistem akan otomatis menggunakan nilai kontrak ini sebagai dasar perhitungan pendapatan proyek pada Laporan Eksekutif dan pembuatan anggaran RAB.",
    "note"
  );

  // --- HALAMAN 5: BUDGETING & RAB ---
  helper.addNewPage();
  helper.addHeading1("4. MODUL KONTROL BUDGET (RAB & BUKU KAS)");
  helper.addParagraph(
    "RAB (Rencana Anggaran Biaya) berfungsi sebagai pengunci pagu pengeluaran keuangan proyek. Proyek tidak dapat memulai produksi fisik SPK sebelum memiliki RAB yang disetujui (Approved) oleh Manager."
  );

  helper.addHeading2("A. Panduan Tombol di Halaman Kontrol Budget:");
  helper.addBullet("Tombol 'Buat RAB Baru'", "Membuka formulir pembuatan dokumen RAB awal. Anda wajib memilih Kontrak Induk yang aktif, menentukan Target Volume Precast (misal: 1000) dan Satuan unit (misal: pcs).");
  helper.addBullet("Input 'Harga Jual per Unit' (AUTO / MANUAL)", "Secara default (AUTO), harga jual unit dihitung dari Nilai Kontrak dibagi Target Volume. Jika Anda memilih MANUAL, Anda bebas mengetik nominal harga jual kustom per unit precast yang akan disimpan persisten untuk perhitungan Break-Even Point (BEP).");
  helper.addBullet("Input parameter Biaya Tetap", "Masukkan Biaya Tetap (Fixed Cost), Depresiasi Cetakan Alat, dan Overhead HO kantor pusat (dalam Rupiah) untuk menampung biaya tidak langsung proyek.");

  helper.addHeading2("B. Penyusunan Rincian BOM & Rencana Tenaga Kerja:");
  helper.addParagraph(
    "Setelah dokumen RAB tersimpan sebagai DRAFT, klik dokumen tersebut untuk membuka panel detail anggaran. Di sini terdapat dua tab input krusial:"
  );
  helper.addBullet("Tab BOM (Bill of Materials)", "Klik tombol '+ Tambah Bahan Baku'. Pilih item material dari Gudang Pusat (misal: Semen Tonasa), tentukan estimasi kuantitas kebutuhan total, dan harga beli satuan. Klik 'Simpan BOM'. Nilai ini otomatis menjadi pagu pembatas alokasi material.");
  helper.addBullet("Tab Manpower (Tenaga Kerja)", "Klik tombol '+ Tambah Tenaga Kerja'. Tentukan jumlah kru (headcount), peran (misal: Tukang Besi), dan tarif upah harian mereka.");

  helper.addHeading2("C. Pengajuan & Approval RAB:");
  helper.addParagraph(
    "Setelah BOM dan Manpower selesai disusun, staf mengklik tombol 'Ajukan RAB' untuk memvalidasi statusnya menjadi PENDING. Akun Manager kemudian masuk dan mengklik tombol hijau 'Setujui RAB' untuk mengaktifkan pagu anggaran dan memicu notifikasi bot Telegram secara otomatis."
  );

  // --- HALAMAN 6: RENCANA PRODUKSI (SPK) & PENGADAAN (PO) ---
  helper.addNewPage();
  helper.addHeading1("5. MODUL RENCANA PRODUKSI (SPK) & PENGADAAN (PO)");
  helper.addParagraph(
    "Modul Rencana Produksi (SPK) menerbitkan surat izin pencetakan beton di workshop. Sementara modul Pengadaan (Procurement) mengelola pemesanan bahan baku mentah kepada supplier rekanan."
  );

  helper.addHeading2("A. Rilis Surat Perintah Kerja (SPK) Produksi");
  helper.addParagraph(
    "Masuk ke menu Rencana Produksi, klik tombol 'Terbitkan SPK Baru' untuk membuka formulir. Pilihlah Kontrak Induk yang memiliki RAB Approved. Masukkan Target Volume SPK (tidak boleh melebihi target RAB), Satuan (pcs/box), Tanggal Mulai dan Tanggal Deadline Pengecoran. Klik 'Terbitkan SPK' untuk merilis nomor SPK otomatis."
  );

  helper.addHeading2("B. Manajemen Pengadaan PO Supplier");
  helper.addParagraph(
    "Masuk ke menu Pengadaan & Supplier, halaman ini terbagi menjadi 3 tab utama:"
  );
  helper.addBullet("Tab Supplier Vendor", "Klik '+ Tambah Supplier Baru' untuk mendaftarkan profil supplier material (Nama Vendor, Telp, Alamat, Kategori suplai).");
  helper.addBullet("Tab Purchase Orders (PO) - Tombol '+ Buat PO Baru'", "Klik tombol '+ Buat PO Baru' untuk merilis dokumen PO. Pilih Supplier, ketik Catatan Pengiriman. Klik tombol '+ Tambah Baris Item' untuk memilih material mentah (misal: Besi D.13), masukkan Jumlah Pesan dan Harga Beli per Unit. Klik tombol panah hijau 'Simpan PO'. Status awal PO adalah PENDING.");
  helper.addBullet("Tombol Aksi 'Kirim PO' & 'Verifikasi Barang Masuk'", "Ubah status PO menjadi SHIPPED jika barang dikirim. Saat truk supplier tiba di pabrik, staf mengklik tombol 'Verifikasi Barang Masuk' pada detail PO. Tindakan ini akan mengubah status PO menjadi COMPLETED, mencatat log barang masuk, dan secara otomatis menambahkan jumlah stok fisik bahan baku tersebut di Gudang Pusat.");

  helper.addCallout(
    "Setiap material yang masuk ke gudang pusat via PO supplier akan menggunakan nominal harga beli aktual dari PO untuk dibandingkan dengan estimasi harga beli di BOM RAB demi mendeteksi selisih harga pasar.",
    "note"
  );

  // --- HALAMAN 7: BKH HARIAN & QC PELACAKAN UNIT ---
  helper.addNewPage();
  helper.addHeading1("6. MONITORING BKH HARIAN & QUALITY CONTROL (QC)");
  helper.addParagraph(
    "Modul Monitoring BKH adalah halaman operasional harian tempat mencatat hasil cor basah precast dan melakukan inspeksi cacat unit individual demi kenyamanan pelacakan kualitas produk."
  );

  helper.addHeading2("A. Menginput Buku Kerja Harian (BKH)");
  helper.addParagraph(
    "Masuk ke menu Monitoring BKH, klik tombol '+ Input BKH Harian'. Pilih Nomor SPK aktif terkait, tentukan Tanggal Cetak, dan masukkan kuantitas hasil cetak harian: GOOD (jumlah precast lolos QC fisik), REJECT (jumlah precast cacat saat cetak), dan RETUR. Tambahkan catatan kendala produksi. Klik 'Simpan BKH'."
  );

  helper.addHeading2("B. Logika Barcode Serial Number Otomatis");
  helper.addParagraph(
    "Setiap kali Anda menginput jumlah unit GOOD di BKH Harian (misal: 10 unit), sistem secara otomatis menerbitkan 10 kode Serial Number unik di database dengan format: 'KB-[NoSPK]-[TglCetak]-[RunningNumber]' (contoh: KB-SPK260001-20260622-0001). Setiap kode serial number merepresentasikan satu fisik unit precast beton."
  );

  helper.addHeading2("C. Papan Grid Pelacakan Unit & Aksi Inspeksi QC");
  helper.addParagraph(
    "Masuk ke tab Pelacakan Unit di Monitoring BKH. Buka accordion proyek SPK bersangkutan. Anda akan melihat deretan kotak-kotak grid kecil yang mewakili setiap unit precast berdasarkan serial number-nya:"
  );
  helper.addBullet("Kotak Berwarna Hijau", "Menandakan kondisi unit dalam keadaan baik (GOOD) dan siap dikirim.");
  helper.addBullet("Kotak Berwarna Merah", "Menandakan kondisi unit dalam keadaan rusak/cacat (REJECT).");
  helper.addBullet("Tombol Aksi QC 'Jadikan REJECT'", "Klik pada kotak unit yang diinginkan, ketik Alasan Kerusakan (misal: keropos bagian sudut), lalu klik tombol 'Jadikan REJECT'. Stok Barang Jadi siap kirim akan otomatis berkurang secara presisi.");
  helper.addBullet("Tombol Aksi QC 'Jadikan GOOD'", "Klik pada unit yang reject, lalu klik tombol 'Jadikan GOOD' apabila proses reparasi adukan semen telah selesai dilakukan. Stok Barang Jadi akan kembali bertambah.");

  // --- HALAMAN 8: LOGISTIK PENGIRIMAN & BUKU KAS SPK ---
  helper.addNewPage();
  helper.addHeading1("7. LOGISTIK PENGIRIMAN & BUKU KAS PENGELUARAN SPK");
  helper.addParagraph(
    "Modul Logistik Pengiriman mengelola rilis Surat Jalan untuk pengiriman precast ke site proyek. Modul Buku Kas Pengeluaran mencatat realisasi kas riil operasional lapangan."
  );

  helper.addHeading2("A. Pengiriman Finished Goods (Delivery Note / Surat Jalan)");
  helper.addParagraph(
    "Masuk ke menu Gudang Proyek, buka tab Pengiriman Finished Goods. Klik tombol '+ Buat Delivery Note' untuk merilis surat jalan. Pilih Proyek terkait, pilih item precast, masukkan Jumlah Kirim (unit yang dikirim akan divalidasi tidak boleh melebihi stok GOOD yang tersedia di Gudang Jadi), masukkan Nama Driver, Plat Kendaraan, dan Nomor Surat Jalan. Klik 'Simpan Delivery Note'. Stok Gudang Barang Jadi otomatis berkurang."
  );

  helper.addHeading2("B. Buku Kas Pengeluaran Aktual Proyek (Expenses)");
  helper.addParagraph(
    "Masuk ke menu Kontrol Budget, buka tab Pengeluaran Aktual. Klik tombol '+ Catat Pengeluaran Baru'. Pilih SPK Proyek terkait, masukkan Kategori Pengeluaran (MATERIAL / MANPOWER / OVERHEAD), tentukan Nominal Pengeluaran (Rupiah), Tanggal Nota, dan berikan Catatan/Keterangan Detail transaksi. Klik 'Simpan Pengeluaran'."
  );

  helper.addHeading2("C. Logika Warning Over-Budget (>90%)");
  helper.addParagraph(
    "Setiap kali Anda menyimpan pengeluaran baru atau realisasi belanja PO supplier, sistem di backend akan menjumlahkan seluruh biaya aktual proyek tersebut secara real-time dan membaginya dengan total pagu anggaran RAB. Jika hasil rasio belanja mencapai atau melebihi 90% (0.90), sistem secara otomatis memicu Bot Telegram untuk mengirimkan pesan peringatan darurat ke grup koordinasi manajer."
  );

  helper.addCallout(
    "Nominal pengeluaran kas aktual yang dicatat harian di tab ini akan langsung disinkronkan ke halaman Laporan Eksekutif Keuangan sebagai pengurang pendapatan (biaya aktual) untuk menghitung laba kotor proyek.",
    "warning"
  );

  // --- HALAMAN 9: LAPORAN EKSEKUTIF DIREKSI & TELEGRAM BOT ---
  helper.addNewPage();
  helper.addHeading1("8. LAPORAN EKSEKUTIF DIREKSI & TELEGRAM BOT");
  helper.addParagraph(
    "Halaman Laporan Eksekutif adalah dashboard khusus manajemen puncak untuk mengevaluasi kelayakan ekonomi proyek dan likuiditas kas operasional pabrik precast."
  );

  helper.addHeading2("A. Analisis Gross Profit Margin (Margin Laba Kotor)");
  helper.addParagraph(
    "Menampilkan perbandingan pendapatan kontrak terhadap biaya aktual. Pendapatan diambil dari Nilai Kontrak, sedangkan Biaya Aktual adalah akumulasi belanja PO supplier ditambah biaya operasional kas lapangan yang tercatat. Proyeksi margin ditampilkan dalam persentase untuk mendeteksi kerugian sedini mungkin."
  );

  helper.addHeading2("B. Analisis Break-Even Point (BEP) Volume");
  helper.addParagraph(
    "Menghitung volume cetak minimum (dalam unit) agar pendapatan proyek menutupi biaya tetap (Fixed Cost + Depresiasi Alat + Overhead HO). Nilai BEP Volume dibandingkan langsung dengan kuantitas precast GOOD yang telah sukses dicetak di lapangan. Jika volume GOOD melebihi target BEP Volume, bar proyek akan menampilkan label hijau 'BEP Tercapai' yang menandakan proyek sudah menghasilkan profit bersih bagi perusahaan."
  );

  helper.addHeading2("C. Notifikasi Otomatis Bot Telegram");
  helper.addParagraph(
    "Platform terhubung ke Bot Telegram untuk notifikasi instan. Token bot dan Chat ID grup diatur pada file konfigurasi '.env.local'. Pemicu notifikasi otomatis terjadi pada 3 kondisi: (1) RAB Baru Disetujui oleh Manager, (2) Batas Stok Bahan Baku Kritis di bawah batas aman Gudang Pusat, dan (3) Biaya Pengeluaran Aktual SPK mencapai lebih dari 90% dari pagu anggaran."
  );

  helper.addHeading2("D. Tombol Aksi di Halaman Laporan Eksekutif:");
  helper.addBullet("Tombol 'Refresh data' (Ikon Putar Ulang)", "Menginstruksikan server untuk memproses ulang seluruh agregasi transaksi keuangan, BEP, dan cash flow bulanan terupdate dari database.");

  // --- HALAMAN 10: MANAJEMEN AKUN & TROUBLESHOOTING ---
  helper.addNewPage();
  helper.addHeading1("9. MANAJEMEN AKUN & TROUBLESHOOTING");
  helper.addParagraph(
    "Modul terakhir membahas administrasi pengguna, preferensi visual profil pribadi, dan tabel penanganan masalah operasional harian."
  );

  helper.addHeading2("A. Manajemen Akun Karyawan & Profil");
  helper.addBullet("Tombol 'Tambah Akun Baru' (Khusus Admin)", "Membuat profil login karyawan baru dengan menetapkan username, password, nama lengkap, dan tingkat jabatan (Admin/Manager/Assistant Manager/Staff).");
  helper.addBullet("Tombol 'Suspend Akun' (Ikon Silang)", "Membekukan akun karyawan sehingga diblokir dari sistem tanpa menghapus data historis inputannya.");
  helper.addBullet("Tombol 'Toggle Dark Mode' (Ikon Bulan/Matahari)", "Mengubah warna visual tema aplikasi dari Terang ke Gelap Premium secara instan (tersimpan di browser localStorage).");

  helper.addHeading2("B. Tabel Panduan Masalah (Troubleshooting Guide):");
  helper.drawTableRow(["Gejala Masalah", "Kemungkinan Penyebab", "Solusi Penanganan"], [40, 55, 75], true);
  helper.drawTableRow(
    [
      "Error 'No transactions support in neon-http driver' saat simpan.",
      "Driver database Neon HTTP tidak mendukung transaction rollback.",
      "Sudah Teratasi penuh pada pembaruan Juni 2026 dengan migrasi query sekuensial."
    ],
    [40, 55, 75]
  );
  helper.drawTableRow(
    [
      "Notifikasi bot Telegram tidak masuk ke grup.",
      "Token bot atau Chat ID grup pada file .env.local kosong / salah.",
      "Masukkan bot token dari @BotFather dan chat ID dari @jsondumpbot ke .env.local."
    ],
    [40, 55, 75]
  );
  helper.drawTableRow(
    [
      "Stok bahan baku gudang tidak bertambah setelah PO dirilis.",
      "Status dokumen PO masih PENDING atau SHIPPED.",
      "Stok otomatis bertambah HANYA ketika Anda mengklik tombol 'Verifikasi Barang Masuk' di PO."
    ],
    [40, 55, 75]
  );
  helper.drawTableRow(
    [
      "Gagal menginput pengeluaran kas (expenses) lapangan.",
      "Stok atau anggaran melebihi batas yang disetujui.",
      "Periksa limit sisa anggaran pada tab Kontrol Budget sebelum menginput nota baru."
    ],
    [40, 55, 75]
  );

  // --- SAVE PDF TO BUFFER & WRITE TO WORKSPACE ---
  helper.drawHeaderFooter(); // Draw final page footer
  const arrayBuffer = doc.output("arraybuffer");
  const buffer = Buffer.from(arrayBuffer);

  const outputPath = path.join(__dirname, "..", "..", "UserManual_KBPrecast_v1.0.pdf");
  fs.writeFileSync(outputPath, buffer);
  console.log(`Successfully generated PDF manual at: ${outputPath}`);
}

generatePDF();
