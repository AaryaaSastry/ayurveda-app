import React from 'react'
import './report.css'
import { sanitizeMarkdownText } from './utils/textUtils'
import { downloadMedicalReportPDF } from './utils/pdfExport'

function ReportRenderer({ content }) {
  if (!content) return null

  const parts = content.split('---REPORT_DATA---').filter(part => part.trim())
  const summary = sanitizeMarkdownText(parts[0] || (content.includes('{') ? 'Medical Report Generated' : content))
  let reportJson = content.includes('---REPORT_DATA---') ? parts[1] : content

  let report = null
  try {
    if (reportJson) {
      reportJson = reportJson.replace(/```json/g, '').replace(/```/g, '').trim()
      const start = reportJson.indexOf('{')
      const end = reportJson.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        report = JSON.parse(reportJson.substring(start, end + 1))
      }
    }
  } catch (error) {
    console.error('Failed to parse report JSON', error)
  }

  const handleDownloadPDF = () => {
    if (!report) {
      console.warn('ReportRenderer: No report data to download')
      return
    }
    downloadMedicalReportPDF(report)
  }

  if (!report) {
    return <div className="report-fallback">{sanitizeMarkdownText(content)}</div>
  }

  return (
    <div className="report-container">
      <div className="chat-summary-bubble">
        <p>{summary.trim()}</p>
        <button
          type="button"
          onClick={handleDownloadPDF}
          className="download-btn"
          aria-label="Download full medical report as PDF"
        >
          Download Full Medical Report (PDF)
        </button>
      </div>
    </div>
  )
}

export default ReportRenderer

