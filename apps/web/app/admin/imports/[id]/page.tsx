'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  getImportErrors,
  getImportRun,
  markImportFailed,
  ImportErrorPage,
  ImportRun,
} from '../../../../lib/admin-api';

const PAGE_SIZE = 25;

export default function ImportRunDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [run, setRun] = useState<ImportRun | null>(null);
  const [errors, setErrors] = useState<ImportErrorPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [markingFailed, setMarkingFailed] = useState(false);
  const [error, setError] = useState('');

  const hasNext = useMemo(() => errors?.hasNext ?? false, [errors]);

  const fetchDetail = useCallback(async () => {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      const [runData, errorPage] = await Promise.all([
        getImportRun(id),
        getImportErrors(id, page, PAGE_SIZE),
      ]);
      setRun(runData);
      setErrors(errorPage);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load import.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const onMarkFailed = async () => {
    if (!run) {
      return;
    }
    try {
      setMarkingFailed(true);
      const updated = await markImportFailed(run.id);
      setRun(updated);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark run.';
      setError(message);
    } finally {
      setMarkingFailed(false);
    }
  };

  const canMarkFailed = run?.status === 'QUEUED' || run?.status === 'RUNNING';

  return (
    <div className="admin-shell">
      <div className="admin-row" style={{ justifyContent: 'space-between' }}>
        <h1>Import Detail</h1>
        <div className="admin-row" style={{ gap: 12 }}>
          {canMarkFailed ? (
            <button
              type="button"
              className="admin-button secondary"
              onClick={onMarkFailed}
              disabled={markingFailed}
            >
              {markingFailed ? 'Marking...' : 'Mark failed'}
            </button>
          ) : null}
          <Link href="/admin/imports" className="admin-button secondary">
            Back to imports
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="admin-muted">Loading...</p>
      ) : error ? (
        <p className="admin-muted">{error}</p>
      ) : run ? (
        <>
          <div className="admin-card">
            <p>
              <strong>ID:</strong> {run.id}
            </p>
            <p>
              <strong>Status:</strong> {run.status}
            </p>
            <p>
              <strong>Created:</strong> {new Date(run.createdAt).toLocaleString()}
            </p>
            <p>
              <strong>Started:</strong>{' '}
              {run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}
            </p>
            <p>
              <strong>Finished:</strong>{' '}
              {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '—'}
            </p>
            <p>
              <strong>Total Rows:</strong> {run.totalRows}
            </p>
            <p>
              <strong>Inserted:</strong> {run.inserted}
            </p>
            <p>
              <strong>Updated:</strong> {run.updated}
            </p>
            <p>
              <strong>Deactivated:</strong> {run.deactivated}
            </p>
            <p>
              <strong>Errors:</strong> {run.errorCount}
            </p>
          </div>

          <div className="admin-card">
            <div className="admin-row" style={{ justifyContent: 'space-between' }}>
              <strong>Row errors</strong>
              <span className="admin-muted">
                Page {errors?.page ?? 1} of{' '}
                {errors ? Math.max(1, Math.ceil(errors.total / errors.pageSize)) : 1}
              </span>
            </div>
            {errors && errors.items.length > 0 ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Field</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.items.map((row) => (
                    <tr key={row.id}>
                      <td>{row.rowNumber}</td>
                      <td>{row.field ?? '—'}</td>
                      <td>{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="admin-muted">No row errors.</p>
            )}

            <div className="admin-row" style={{ marginTop: 12 }}>
              <button
                className="admin-button secondary"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <button
                className="admin-button"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!hasNext}
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
