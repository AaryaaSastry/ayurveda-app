import { jsPDF } from 'jspdf'

export function downloadMedicalReportPDF(report) {
  if (!report) return

  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth() // 210 for A4
    const pageHeight = doc.internal.pageSize.getHeight() // 297 for A4

    // Ayurvedic Green Theme Colors (Rich Forest Green & Soft Sage)
    const HEADER_BLUE = [44, 70, 61]
    const LABEL_BLUE = [225, 236, 230]

    // Helper to draw a standard cell in the grid
    const drawCell = (x, y, w, h, text, isLabel = false, align = 'justify') => {
      doc.setDrawColor(50, 50, 50);
      doc.setLineWidth(0.2);
      if (isLabel) {
        doc.setFillColor(LABEL_BLUE[0], LABEL_BLUE[1], LABEL_BLUE[2]);
        doc.rect(x, y, w, h, 'FD');
        doc.setFont('times', 'bold');
        align = 'left'; // Labels are usually better left aligned
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(x, y, w, h, 'FD');
        doc.setFont('times', 'normal');
      }
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);

      if (text) {
        const options = { maxWidth: w - 4, lineHeightFactor: 1.5 };
        if (align === 'center') {
          options.align = 'center';
          doc.text(String(text), x + w / 2, y + 6, options);
        } else if (align === 'justify' && !isLabel) {
          options.align = 'justify';
          doc.text(String(text), x + 2, y + 6, options);
        } else {
          doc.text(String(text), x + 2, y + 6, options);
        }
      }
    };

    // --- PAGE 1: HEADER BLOCK ---
    doc.setFillColor(HEADER_BLUE[0], HEADER_BLUE[1], HEADER_BLUE[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(20);
    doc.text('Ayurvedic Clinical Consultation', 20, 18);
    doc.setFontSize(14);
    doc.text("Patient's Copy", 20, 28);

    // Right side AI Logo (Magic Sparkles)
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.rect(pageWidth - 85, 12, 12, 12, 'S'); // Square box

    doc.setFillColor(255, 255, 255);
    const drawSpark = (cx, cy, r) => {
      const s = r * 0.25; // Spark inner thickness
      doc.triangle(cx, cy - r, cx + s, cy - s, cx - s, cy - s, 'F'); // Top
      doc.triangle(cx, cy + r, cx + s, cy + s, cx - s, cy + s, 'F'); // Bottom
      doc.triangle(cx + r, cy, cx + s, cy - s, cx + s, cy + s, 'F'); // Right
      doc.triangle(cx - r, cy, cx - s, cy - s, cx - s, cy + s, 'F'); // Left
      doc.rect(cx - s, cy - s, s * 2, s * 2, 'F'); // Center connection
    };

    // Draw two magical sparks representing AI intelligence
    drawSpark(pageWidth - 80, 19, 3.5);
    drawSpark(pageWidth - 75.5, 15.5, 1.8);

    doc.setFontSize(11);
    doc.setFont('times', 'bold');
    doc.text('Ayurveda Clinical', pageWidth - 68, 16);
    doc.text('Assistant', pageWidth - 68, 22);

    // --- PATIENT DEMOGRAPHICS ---
    let y = 50;
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    doc.text('Patient Demographics', 20, y);
    y += 4;

    const reportId = `AYU-${Math.floor(Math.random() * 90000) + 10000}`;
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Row 1
    drawCell(20, y, 25, 10, 'Name', true);
    drawCell(45, y, 35, 10, 'Patient', false, 'left');
    drawCell(80, y, 25, 10, 'Gender', true);
    drawCell(105, y, 30, 10, report.patientInfo?.gender || 'N/A', false, 'left');
    drawCell(135, y, 25, 10, 'Location', true);
    drawCell(160, y, 30, 10, 'Online Consult', false, 'left');
    y += 10;

    // Row 2
    drawCell(20, y, 25, 10, 'ID No.', true);
    drawCell(45, y, 35, 10, reportId, false, 'left');
    drawCell(80, y, 25, 10, 'Date', true);
    drawCell(105, y, 30, 10, currentDate, false, 'left');
    drawCell(135, y, 25, 10, 'Age', true);
    drawCell(160, y, 30, 10, report.patientInfo?.age || 'N/A', false, 'left');
    y += 15;

    // --- PATIENT VITALS ---
    doc.setFillColor(LABEL_BLUE[0], LABEL_BLUE[1], LABEL_BLUE[2]);
    doc.rect(20, y, 170, 8, 'F'); // Full width vitals block
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text('Patient Vitals:    Height: ' + (report.patientInfo?.height || 'N.A.') + '     /     Weight: ' + (report.patientInfo?.weight || 'N.A.'), 24, y + 5.5);

    y += 12;

    // --- CLINICAL OBSERVATIONS ---
    doc.setFillColor(HEADER_BLUE[0], HEADER_BLUE[1], HEADER_BLUE[2]); // Dark blue header
    doc.rect(20, y, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text('Medical / Clinical / Symptom History', 105, y + 5.5, { align: 'center' });
    y += 8;

    const symptomsStr = report.symptomsReported?.length ? report.symptomsReported.join('; ') : 'N.A.';
    const prakritiStr = report.patientInfo?.constitution || 'N.A.';

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    const sympTextHeight = Math.max(12, doc.splitTextToSize(symptomsStr, 166).length * 5.3);
    const prakTextHeight = Math.max(12, doc.splitTextToSize(prakritiStr, 166).length * 5.3);

    const blockHeight = sympTextHeight + prakTextHeight + 20;

    doc.setFillColor(LABEL_BLUE[0], LABEL_BLUE[1], LABEL_BLUE[2]); // Light blue body
    doc.rect(20, y, 170, blockHeight, 'F');
    doc.setDrawColor(50, 50, 50);
    doc.setLineWidth(0.2);
    doc.rect(20, y - 8, 170, blockHeight + 8, 'S'); // Border around the whole block

    doc.setTextColor(20, 20, 20);

    // Draw Symptoms Header & Body
    doc.setFont('times', 'bold');
    doc.text('Reported Symptoms:', 22, y + 6);
    doc.setFont('times', 'normal');
    doc.text(symptomsStr, 24, y + 12, { maxWidth: 164, align: 'left', lineHeightFactor: 1.5 });

    const nextY = y + 12 + sympTextHeight;

    // Draw Prakriti Header & Body
    doc.setFont('times', 'bold');
    doc.setFont('times', 'normal');
    doc.text(prakritiStr, 24, nextY + 6, { maxWidth: 164, align: 'left', lineHeightFactor: 1.5 });

    y += blockHeight + 10;

    // --- MAIN DATA TABLE ---
    const calculateHeight = (text, width) => {
      if (!text) return 10;
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(String(text), width - 4);
      return Math.max(10, splitText.length * 5.3 + 6); // More padding for 1.5 lineHeight
    };

    const drawDataRowDynamic = (label, value) => {
      const valString = Array.isArray(value) ? value.join('; ') : String(value || 'N.A.');
      let h = calculateHeight(valString, 110);

      if (y + h > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }

      drawCell(20, y, 60, h, label, true);      // Left label cell
      drawCell(80, y, 110, h, valString, false, 'justify'); // Right value cell (Justified)
      y += h;
    };

    drawDataRowDynamic('Consultation Date / Time', new Date().toLocaleString());

    drawDataRowDynamic('Principal Doctor', 'Ayurveda AI Clinical Assistant');

    drawDataRowDynamic('Principal Diagnosis', report.diagnosis?.name || 'N.A.');

    drawDataRowDynamic('Reason / Clinical Assessment', report.diagnosis?.reasoning || 'N.A.');

    const pathyaStr = report.dietaryGuide?.toConsume?.join('; ') || 'N.A.';
    drawDataRowDynamic('Dietary Inclusion (Pathya)', pathyaStr);

    const apathyaStr = report.dietaryGuide?.toAvoid?.join('; ') || 'N.A.';
    drawDataRowDynamic('Dietary Restriction (Apathya)', apathyaStr);

    const lifestyleStr = report.lifestyleChanges?.join('; ') || 'N.A.';
    drawDataRowDynamic('Lifestyle Adjustments', lifestyleStr);

    const herbalStr = report.herbalPreparations?.map(h => `${h.name} (${h.purpose})`).join('; ') || 'N.A.';
    drawDataRowDynamic('Herbal Formulations', herbalStr);

    // --- FOOTER ---
    const drawFooter = () => {
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.setFont('times', 'normal');
      doc.text('Ayurveda Clinical Assistant Official Copy', 105, pageHeight - 10, { align: 'center' });
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      drawFooter();
    }

    const safeName = (report.diagnosis?.name || 'Report').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `discharge_summary_${safeName}.pdf`;

    doc.save(fileName)

  } catch (error) {
    console.error('CRITICAL: PDF generation failed!', error)
    alert(`Error generating PDF: ${error.message || 'Unknown error'}`)
  }
}
