import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToPDF = (title, headers, data, fileName = 'report.pdf') => {
  const doc = new jsPDF();
  doc.text(title, 14, 20);
  autoTable(doc, {
    startY: 30,
    head: [headers],
    body: data.map(row => headers.map(header => row[header] || '')),
  });
  doc.save(fileName);
};

export const exportToExcel = (data, fileName = 'report.xlsx') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  XLSX.writeFile(workbook, fileName);
};
