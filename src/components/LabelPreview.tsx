import { useState } from "react"
import { QrCode } from "@/components/ui/qr-code"

const PREVIEW_PAGE_SIZE = 12

export default function LabelPreview({ selectedRecords, onGoToRecords, customFields = [] as any[], enabledCustomFieldKeys = [] as string[] }: {
  selectedRecords: { code: string; project?: string; date?: string }[]
  onGoToRecords: () => void
  customFields?: any[]
  enabledCustomFieldKeys?: string[]
}) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(selectedRecords.length / PREVIEW_PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedRecords = selectedRecords.slice((safePage - 1) * PREVIEW_PAGE_SIZE, safePage * PREVIEW_PAGE_SIZE)

  if (!selectedRecords.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><i className="ti ti-selector"></i></div>
        <h3 style={{ marginBottom: "0.5rem" }}>برچسبی انتخاب نشده</h3>
        <p style={{ opacity: 0.7, marginBottom: "1.5rem" }}>در تب سوابق، رکوردها را انتخاب کنید</p>
        <button className="btn btn-primary" onClick={onGoToRecords}>
          <i className="ti ti-arrow-right"></i> رفتن به سوابق
        </button>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="d-flex align-items-center gap-2 mb-4 p-3" style={{ background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--border-color)" }}>
        <i className="ti ti-scissors" style={{ fontSize: "1.5rem", color: "var(--primary)" }}></i>
        <span>خطوط برش (✂) برای بریدن پس از چاپ - {selectedRecords.length} برچسب</span>
      </div>

      <div className="preview-grid" dir="rtl" id="preview-grid">
        {pagedRecords.map((record) => (
          <div key={record.code} className="card relative py-3 mb-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start gap-3 px-3">
              <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center shrink-0">
                <span className="text-white font-medium">{String(record.code).slice(0, 2)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{record.project}</div>
                <div className="text-xs text-muted-foreground">{record.date || ""}</div>
              </div>
              <div className="absolute right-2 top-2">
                <QrCode value={record.code} size={72} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}