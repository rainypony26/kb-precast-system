import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── EXPORT KE EXCEL DENGAN KOLOM AUTO-FIT ────────────────────────────────────
export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  // Hitung lebar maksimal tiap kolom berdasarkan panjang data untuk mencegah text terpotong
  if (data && data.length > 0) {
    const colWidths = Object.keys(data[0]).map((key) => {
      let maxLen = key.length;
      data.forEach((row) => {
        const val = row[key] !== null && row[key] !== undefined ? row[key].toString() : "";
        if (val.length > maxLen) {
          maxLen = val.length;
        }
      });
      return { wch: Math.min(Math.max(maxLen + 4, 12), 60) }; // Min lebar 12, Max 60
    });
    worksheet["!cols"] = colWidths;
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// ─── EXPORT KE PDF DENGAN LAYOUT PREMIUM & ZEBRA-STRIPING ──────────────────────
export const exportToPDF = (title: string, headers: string[][], body: any[][], fileName: string) => {
  const doc = new jsPDF('p', 'mm', 'a4'); // A4 Portrait
  
  // 1. Dekorasi Header Atas (Emerald Green khas Kalla Beton)
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, 210, 8, 'F');
  
  // 2. Sub-Header Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("KALLA BETON PRECAST SYSTEM - OFFICIAL REPORT", 14, 18);
  
  // 3. Judul Laporan Utama
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(title.toUpperCase(), 14, 26);
  
  // 4. Meta Informasi Cetak (Tanggal & Waktu)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  const printDate = new Date().toLocaleString('id-ID', { 
    dateStyle: 'long', 
    timeStyle: 'short' 
  });
  doc.text(`Tanggal Cetak: ${printDate} WITA`, 14, 32);
  
  // 5. Garis Pembatas Halus (Border Slate-200)
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, 35, 196, 35);

  // 6. Generate Tabel Menggunakan AutoTable (Striped Theme)
  autoTable(doc, {
    startY: 40,
    head: headers,
    body: body,
    theme: 'striped',
    headStyles: { 
      fillColor: [16, 185, 129], // Emerald 600
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 3.5,
      halign: 'left'
    },
    alternateRowStyles: { 
      fillColor: [244, 252, 248] // Warna hijau-emerald sangat muda untuk zebra row
    },
    styles: { 
      fontSize: 8, 
      font: 'helvetica',
      cellPadding: 2.8,
      textColor: [51, 65, 85], // slate-700
      lineColor: [241, 245, 249], // slate-100 border
      lineWidth: 0.1,
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer Halaman
      const pageCount = doc.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      
      // Catatan di kiri
      doc.text(
        "Laporan ini dihasilkan secara otomatis oleh sistem logistik Kalla Beton.", 
        14, 
        doc.internal.pageSize.height - 10
      );
      
      // Page Number di kanan
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount}`, 
        doc.internal.pageSize.width - 35, 
        doc.internal.pageSize.height - 10
      );
    }
  });

  doc.save(`${fileName}.pdf`);
};