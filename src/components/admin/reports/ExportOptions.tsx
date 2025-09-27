'use client'

import { useState } from 'react'
import { format } from 'date-fns'

interface DateRange {
  start: Date
  end: Date
  label: string
}

interface ExportOptionsProps {
  reportData: Record<string, any> | null
  dateRange: DateRange
}

export default function ExportOptions({ reportData, dateRange }: ExportOptionsProps) {
  const [exporting, setExporting] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  const generateCSV = (data: Record<string, any>[], filename: string) => {
    if (!data.length) return

    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value
      ).join(',')
    ).join('\n')

    const csv = `${headers}\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const generateJSON = (data: Record<string, any>, filename: string) => {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const generatePrintReport = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const dateRangeString = `${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tjoef-Tjaf Analytics Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .section { margin-bottom: 30px; }
            .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
            .metric-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
            .metric-value { font-size: 24px; font-weight: bold; color: #333; }
            .metric-label { font-size: 14px; color: #666; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .insights { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            @media print { body { margin: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🚐 Tjoef-Tjaf Analytics Report</h1>
            <p><strong>Report Period:</strong> ${dateRangeString}</p>
            <p><strong>Generated:</strong> ${format(new Date(), 'MMM d, yyyy \'at\' h:mm a')}</p>
          </div>

          ${reportData?.financial ? `
          <div class="section">
            <h2>💰 Financial Summary</h2>
            <div class="metric-grid">
              <div class="metric-card">
                <div class="metric-value">R${reportData.financial.totalRevenue.toLocaleString()}</div>
                <div class="metric-label">Total Revenue</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${reportData.financial.totalCreditsIssued.toLocaleString()}</div>
                <div class="metric-label">Credits Issued</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${reportData.financial.totalCreditsUsed.toLocaleString()}</div>
                <div class="metric-label">Credits Used</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">R${Math.round(reportData.financial.averageRevenuePerDay).toLocaleString()}</div>
                <div class="metric-label">Avg Revenue/Day</div>
              </div>
            </div>
          </div>
          ` : ''}

          ${reportData?.operational ? `
          <div class="section">
            <h2>🚐 Operational Metrics</h2>
            <div class="metric-grid">
              <div class="metric-card">
                <div class="metric-value">${reportData.operational.totalTrips.toLocaleString()}</div>
                <div class="metric-label">Total Trips</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${reportData.operational.completedTrips.toLocaleString()}</div>
                <div class="metric-label">Completed Trips</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${reportData.operational.totalBookings.toLocaleString()}</div>
                <div class="metric-label">Total Bookings</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${reportData.operational.averageUtilization}%</div>
                <div class="metric-label">Avg Utilization</div>
              </div>
            </div>
          </div>
          ` : ''}

          ${reportData?.locationAnalytics?.length ? `
          <div class="section">
            <h2>📍 Top Destinations</h2>
            <table>
              <thead>
                <tr>
                  <th>Destination</th>
                  <th>Category</th>
                  <th>Total Trips</th>
                  <th>Total Bookings</th>
                  <th>Popularity Score</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.locationAnalytics.slice(0, 10).map((location: Record<string, any>) => `
                  <tr>
                    <td>${location.name}</td>
                    <td>${location.category}</td>
                    <td>${location.totalTrips}</td>
                    <td>${location.totalBookings}</td>
                    <td>${location.popularity}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${reportData?.analytics?.keyInsights?.length ? `
          <div class="section">
            <h2>💡 Key Insights</h2>
            <div class="insights">
              ${reportData.analytics.keyInsights.map((insight: Record<string, any>) => `
                <div style="margin-bottom: 15px;">
                  <strong>${insight.title}:</strong> ${insight.description}
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <div class="section">
            <p style="text-align: center; color: #666; font-size: 12px; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px;">
              This report was generated automatically by Tjoef-Tjaf Analytics on ${format(new Date(), 'MMM d, yyyy \'at\' h:mm a')}
            </p>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.print()
  }

  const handleExport = async (format: 'csv' | 'json' | 'print') => {
    if (!reportData) return

    setExporting(true)
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm')
      const baseFilename = `tjoeftjaf-report-${timestamp}`

      switch (format) {
        case 'csv':
          // Export financial data
          if (reportData.revenueTrend) {
            generateCSV(reportData.revenueTrend, `${baseFilename}-revenue.csv`)
          }
          // Export bookings data
          if (reportData.bookingsTrend) {
            generateCSV(reportData.bookingsTrend, `${baseFilename}-bookings.csv`)
          }
          // Export location data
          if (reportData.locationAnalytics) {
            generateCSV(reportData.locationAnalytics, `${baseFilename}-locations.csv`)
          }
          break

        case 'json':
          generateJSON(reportData, `${baseFilename}.json`)
          break

        case 'print':
          generatePrintReport()
          break
      }
      
      setShowOptions(false)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={!reportData || exporting}
        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {exporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <span>📊</span>
            <span>Export</span>
          </>
        )}
      </button>

      {showOptions && (
        <div className="absolute top-full right-0 mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 min-w-48">
          <div className="space-y-1">
            <button
              onClick={() => handleExport('csv')}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              📄 Export as CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              📋 Export as JSON
            </button>
            <button
              onClick={() => handleExport('print')}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              🖨️ Print Report
            </button>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2">
            <button
              onClick={() => setShowOptions(false)}
              className="w-full text-left px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}