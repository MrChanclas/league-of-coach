import { useState } from 'react'
import { useAdminReports, useResolveReportMutation } from '../../hooks/useAdmin'
import type { AdminReport, ReportDecision, StrikeSeverity } from '../../types/admin'
import {
  SEVERITY_LABELS,
  SEVERITY_POINTS,
  SOCIAL_BAN_POINTS,
  formatAccount,
  formatDate,
  formatDateTime,
} from './adminFormat'

const SEVERITIES: StrikeSeverity[] = ['leve', 'moderado', 'grave']

const STATUS_LABELS: Record<AdminReport['status'], string> = {
  pending: 'Pendiente',
  dismissed: 'Descartado',
  sanctioned: 'Sancionado',
}

export function AdminReports() {
  const [status, setStatus] = useState<'pending' | 'resolved'>('pending')
  const reportsQuery = useAdminReports(status)
  const reports = reportsQuery.data ?? []

  return (
    <section className="admin-section">
      <div className="admin-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={status === 'pending'} onClick={() => setStatus('pending')}>
          Pendientes
        </button>
        <button type="button" role="tab" aria-selected={status === 'resolved'} onClick={() => setStatus('resolved')}>
          Resueltos
        </button>
      </div>

      {reportsQuery.isLoading && <p className="admin-muted">Cargando reportes…</p>}
      {reportsQuery.isError && <p className="admin-error">{reportsQuery.error.message}</p>}
      {reportsQuery.isSuccess && reports.length === 0 && (
        <p className="empty-state">
          {status === 'pending' ? 'No hay reportes pendientes.' : 'Todavía no resolviste ningún reporte.'}
        </p>
      )}

      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
    </section>
  )
}

function ReportCard({ report }: { report: AdminReport }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const resolveMutation = useResolveReportMutation()
  const { reported } = report

  const handleDecision = async (decision: ReportDecision) => {
    setError('')
    if (decision !== 'dismiss') {
      if (reason.trim().length < 3) {
        setError('Escribe el motivo del strike: el usuario lo verá.')
        return
      }
      const pointsAfter = reported.activePoints + SEVERITY_POINTS[decision]
      if (
        pointsAfter >= SOCIAL_BAN_POINTS &&
        !reported.banned &&
        !window.confirm(
          `Con este strike ${reported.name} llega a ${pointsAfter} puntos y queda fuera de Social: se cierran sus duos y solicitudes. ¿Continuar?`,
        )
      ) {
        return
      }
    }
    try {
      await resolveMutation.mutateAsync({ reportId: report.id, decision, reason })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo resolver el reporte.')
    }
  }

  return (
    <article className="admin-card">
      <header className="admin-card-head">
        <span className={`admin-badge admin-badge--${report.status}`}>{STATUS_LABELS[report.status]}</span>
        <span className="admin-muted">
          {formatDateTime(report.createdAt)} · duo {report.duo.queue === 'flex' ? 'Flex' : 'Solo/Dúo'} desde{' '}
          {formatDate(report.duo.createdAt)}
        </span>
      </header>

      <dl className="admin-parties">
        <div>
          <dt>Reporta</dt>
          <dd>
            <strong>{report.reporter.name}</strong>
            <span>{formatAccount(report.reporter.account)}</span>
          </dd>
        </div>
        <div>
          <dt>Reportado</dt>
          <dd>
            <strong>{reported.name}</strong>
            <span>{formatAccount(reported.account)}</span>
            <span className={reported.banned ? 'admin-error' : 'admin-muted'}>
              {reported.activePoints} {reported.activePoints === 1 ? 'strike vigente' : 'strikes vigentes'}
              {reported.banned && reported.bannedUntil && ` · fuera de Social hasta ${formatDate(reported.bannedUntil)}`}
            </span>
          </dd>
        </div>
      </dl>

      <blockquote className="admin-quote">{report.reason}</blockquote>

      {report.status === 'pending' ? (
        <div className="admin-decision">
          <label>
            Motivo del strike (lo verá el usuario)
            <textarea
              value={reason}
              maxLength={500}
              rows={2}
              placeholder="Ej.: insultos reiterados en el chat del duo."
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <div className="admin-actions">
            <button
              type="button"
              className="secondary-btn"
              disabled={resolveMutation.isPending}
              onClick={() => void handleDecision('dismiss')}
            >
              Descartar
            </button>
            {SEVERITIES.map((severity) => (
              <button
                key={severity}
                type="button"
                className={`admin-strike-btn admin-strike-btn--${severity}`}
                disabled={resolveMutation.isPending}
                onClick={() => void handleDecision(severity)}
              >
                {SEVERITY_LABELS[severity]} · {SEVERITY_POINTS[severity]}{' '}
                {SEVERITY_POINTS[severity] === 1 ? 'strike' : 'strikes'}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="admin-muted">
          {report.resolvedAt && `Resuelto el ${formatDate(report.resolvedAt)}. `}
          {report.strikes.map((strike) => `${SEVERITY_LABELS[strike.severity]}: ${strike.reason}`).join(' · ')}
        </p>
      )}

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
    </article>
  )
}
