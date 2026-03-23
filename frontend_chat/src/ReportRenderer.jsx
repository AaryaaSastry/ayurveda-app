import React from 'react'
import { jsPDF } from 'jspdf'
import './report.css'

function ReportRenderer({ content }) {
  if (!content) return null

  // Split and handle markdown-wrapped JSON
  const parts = content.split('---REPORT_DATA---').filter(p => p.trim())
  const summary = parts[0] || (content.includes('{') ? 'Medical Report Generated' : content)
  let reportJson = content.includes('---REPORT_DATA---') ? parts[1] : content

  let report = null
  try {
    if (reportJson) {
      reportJson = reportJson.replace(/```json/g, '').replace(/```/g, '').trim();
      const start = reportJson.indexOf('{')
      const end = reportJson.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        report = JSON.parse(reportJson.substring(start, end + 1))
      }
    }
  } catch (e) {
    console.error('Failed to parse report JSON', e)
  }

  const handleDownloadPDF = () => {
    if (!report) return
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let y = 20

    const checkPage = (heightNeeded) => {
      if (y + heightNeeded > pageHeight - 20) {
        doc.addPage()
        y = 20
        return true
      }
      return false
    }

    // --- PAGE 1: COVER & PROFILE ---
    doc.setFillColor(26, 115, 232) // Primary Blue
    doc.rect(0, 0, pageWidth, 40, 'F')
    
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('AYURVEDIC CLINICAL REPORT', pageWidth / 2, 25, { align: 'center' })
    
    y = 55
    doc.setTextColor(44, 62, 80)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Report ID: AYU-${Math.floor(Math.random() * 10000)}`, 20, y)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 20, y, { align: 'right' })
    
    y += 15
    doc.setDrawColor(230, 230, 230)
    doc.line(20, y, pageWidth - 20, y)
    y += 10
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('1. PATIENT PROFILING', 20, y)
    y += 10
    
    doc.setFontSize(11)
    doc.setFillColor(248, 250, 252)
    doc.rect(20, y, pageWidth - 40, 28, 'F')
    
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0)
    doc.text(`Age: ${report.patientInfo?.age || 'N/A'}`, 25, y + 8)
    doc.text(`Gender: ${report.patientInfo?.gender || 'N/A'}`, 70, y + 8)
    doc.text(`Height: ${report.patientInfo?.height || 'N/A'}`, 115, y + 8)
    doc.text(`Weight: ${report.patientInfo?.weight || 'N/A'}`, 160, y + 8)
    doc.text(`Primary Constitution (Prakriti): ${report.patientInfo?.constitution || 'N/A'}`, 25, y + 18)
    y += 38

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('2. SUBJECTIVE OBSERVATIONS', 20, y)
    y += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    report.symptomsReported?.forEach(s => {
      doc.text(`• ${s}`, 25, y)
      y += 7
    })
    y += 10

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('3. PROVISIONAL DIAGNOSIS', 20, y)
    y += 8
    
    doc.setDrawColor(26, 115, 232)
    doc.setLineWidth(0.5)
    doc.rect(20, y, pageWidth - 40, 35)
    
    doc.setFontSize(13)
    doc.setTextColor(26, 115, 232)
    doc.text(report.diagnosis?.name || 'Ayu-Condition', 25, y + 10)
    
    doc.setFontSize(10)
    doc.setTextColor(80)
    const reasoningLines = doc.splitTextToSize(report.diagnosis?.reasoning || '', pageWidth - 50)
    doc.text(reasoningLines, 25, y + 18)
    
    // --- PAGE 2: MANAGEMENT ---
    doc.addPage()
    y = 25
    
    doc.setFontSize(16)
    doc.setTextColor(26, 115, 232)
    doc.setFont('helvetica', 'bold')
    doc.text('TREATMENT & MANAGEMENT PLAN', 20, y)
    y += 15

    doc.setFontSize(14)
    doc.setTextColor(44, 62, 80)
    doc.text('4. LIFESTYLE ADJUSTMENTS', 20, y)
    y += 10
    doc.setFontSize(11)
    doc.setTextColor(0)
    doc.setFont('helvetica', 'normal')
    report.lifestyleChanges?.forEach(l => {
      const pLines = doc.splitTextToSize(`• ${l}`, pageWidth - 40)
      doc.text(pLines, 25, y)
      y += (pLines.length * 6)
    })
    y += 10

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('5. DIETARY PRESCRIPTIONS', 20, y)
    y += 10
    
    doc.setFontSize(11)
    doc.setTextColor(46, 204, 113) // Green
    doc.text('FAVORABLE (Pathya):', 25, y); y += 6
    doc.setTextColor(0)
    const toConsume = doc.splitTextToSize(report.dietaryGuide?.toConsume?.join(', ') || '', pageWidth - 50)
    doc.text(toConsume, 30, y); y += (toConsume.length * 6) + 4
    
    doc.setTextColor(231, 76, 60) // Red
    doc.text('AVOID (Apathya):', 25, y); y += 6
    doc.setTextColor(0)
    const toAvoid = doc.splitTextToSize(report.dietaryGuide?.toAvoid?.join(', ') || '', pageWidth - 50)
    doc.text(toAvoid, 30, y); y += (toAvoid.length * 6) + 12

    if (report.herbalPreparations?.length > 0) {
      if (checkPage(40)) y = 25
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(44, 62, 80)
      doc.text('6. SUGGESTED HERBAL FORMULATIONS', 20, y)
      y += 10
      report.herbalPreparations?.forEach(h => {
        if (checkPage(20)) y = 25
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(h.name, 25, y); y += 6
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(10)
        doc.text(`Purpose: ${h.purpose}`, 30, y); y += 10
      })
    }

    // Disclaimer
    y = pageHeight - 40
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(150)
    const discLinesFinal = doc.splitTextToSize(report.disclaimer || '', pageWidth - 40)
    doc.text(discLinesFinal, 20, y)
    
    doc.text(`Generated by Ayu-Assistant AI Service | Page de-facto`, pageWidth / 2, pageHeight - 10, { align: 'center' })

    doc.save(`Ayu_Report_${report.diagnosis?.name?.replace(/\s+/g, '_') || 'Health'}.pdf`)
  }


  if (!report) {
    return <div className="chat-bubble bot">{content}</div>
  }

  return (
    <div className="report-container">
      <div className="chat-summary-bubble">
        <p>{summary.trim()}</p>
        <button onClick={handleDownloadPDF} className="download-btn">
          📄 Download Full Medical Report (PDF)
        </button>
      </div>
    </div>
  )
}

export default ReportRenderer;

