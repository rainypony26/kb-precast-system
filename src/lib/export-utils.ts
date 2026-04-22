import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Ganti cara import-nya di sini

// --- EXPORT KE EXCEL (Tetap Aman) ---
export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// --- EXPORT KE PDF (TABEL) ---
export const exportToPDF = (title: string, headers: string[][], body: any[][], fileName: string) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);

  // PERBAIKAN: Panggil autoTable sebagai fungsi, bukan method dari doc
  autoTable(doc, {
    startY: 30,
    head: headers,
    body: body,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129] }, // Warna Emerald Kalla Beton
    styles: { fontSize: 8 },
  });

  doc.save(`${fileName}.pdf`);
};