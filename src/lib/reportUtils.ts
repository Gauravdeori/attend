import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Class, ClassMembership, ClassAttendanceRecord, AttendanceSession } from '@/types/classes';

interface ReportData {
  className: string;
  teacherName: string;
  students: {
    name: string;
    rollNumber: string;
    attended: number;
    total: number;
    percentage: number;
  }[];
  criteria: number;
  aiInsight?: string;
}

export const generateAttendanceReport = (data: ReportData, format: 'pdf' | 'excel') => {
  try {
    const { className, teacherName, students, criteria, aiInsight } = data;
    const timestamp = new Date().toLocaleDateString();

    if (format === 'pdf') {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(22);
      doc.text(className, 14, 20);
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Teacher: ${teacherName}`, 14, 28);
      doc.text(`Date: ${timestamp}`, 14, 34);
      doc.text(`Minimum Criteria: ${criteria}%`, 14, 40);

      // Table
      const tableRows = students.map(s => [
        s.rollNumber,
        s.name,
        s.attended.toString(),
        s.total.toString(),
        `${s.percentage.toFixed(1)}%`,
        s.percentage < criteria ? 'Defaulter' : 'Safe'
      ]);

      if (tableRows.length === 0) {
        throw new Error("No student data available to generate report.");
      }

      autoTable(doc, {
        startY: 50,
        head: [['Roll No', 'Student Name', 'Attended', 'Total', 'Percentage', 'Status']],
        body: tableRows,
        headStyles: { fillColor: [40, 40, 40] }, // Dark minimalist color instead of primary blue
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
            if (data.cell.text[0] === 'Defaulter') {
              data.cell.styles.textColor = [220, 38, 38]; // Red
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      // Summary
      const finalY = (doc as any).lastAutoTable.cursor.y + 15;
      const defaulters = students.filter(s => s.percentage < criteria).length;
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Summary', 14, finalY);
      doc.setFontSize(10);
      doc.text(`Total Students: ${students.length}`, 14, finalY + 8);
      doc.text(`Defaulters: ${defaulters}`, 14, finalY + 14);

      if (aiInsight) {
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('AI Insights', 14, finalY + 28);
        doc.setFontSize(10);
        doc.setTextColor(60);
        
        // Wrap text to fit page width (A4 is 210mm wide, 14mm margins = 182mm max width)
        const splitInsight = doc.splitTextToSize(aiInsight, 180);
        doc.text(splitInsight, 14, finalY + 36);
      }

      doc.save(`${className.replace(/\s+/g, '_')}_Attendance_Report.pdf`);
    } else {
      // Excel
      const worksheetData: any[][] = [
        ['Class', className],
        ['Teacher', teacherName],
        ['Date', timestamp],
        ['Criteria', `${criteria}%`],
        []
      ];

      if (aiInsight) {
        worksheetData.push(['AI Insights', aiInsight]);
        worksheetData.push([]);
      }

      worksheetData.push(['Roll No', 'Student Name', 'Attended', 'Total', 'Percentage', 'Status']);

      if (students.length === 0) {
        throw new Error("No student data available to generate report.");
      }

      students.forEach(s => {
        worksheetData.push([
          s.rollNumber,
          s.name,
          s.attended.toString(),
          s.total.toString(),
          `${s.percentage.toFixed(1)}%`,
          s.percentage < criteria ? 'Defaulter' : 'Safe'
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
      XLSX.writeFile(workbook, `${className.replace(/\s+/g, '_')}_Attendance_Report.xlsx`);
    }
  } catch (error) {
    console.error("Report generation failed:", error);
    throw error;
  }
};
