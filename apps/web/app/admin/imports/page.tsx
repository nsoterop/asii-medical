'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listImportRuns, uploadImport, markImportFailed, ImportRun } from '../../../lib/admin-api';

export default function AdminImportsPage() {
  const [runs, setRuns] = useState<ImportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [priceMarginPercent, setPriceMarginPercent] = useState('');

  const hasActiveRun = useMemo(
    () => runs.some((run) => run.status === 'QUEUED' || run.status === 'RUNNING'),
    [runs],
  );

  const fetchRuns = async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await listImportRuns();
      setRuns(data);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load imports.';
      setError(message);
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRuns(false);
  }, []);

  useEffect(() => {
    if (!hasActiveRun) {
      return undefined;
    }

    const interval = setInterval(() => {
      fetchRuns(true);
    }, 2000);

    return () => clearInterval(interval);
  }, [hasActiveRun]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Choose a CSV file to upload.');
      return;
    }

    const trimmedMargin = priceMarginPercent.trim();
    const marginValue = trimmedMargin === '' ? 0 : Number(trimmedMargin);
    if (!Number.isFinite(marginValue) || marginValue < 0 || marginValue > 1000) {
      setError('Profit margin must be a number between 0 and 1000.');
      return;
    }

    try {
      setUploading(true);
      await uploadImport(file, marginValue);
      setFile(null);
      await fetchRuns();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const onMarkFailed = async (id: string) => {
    try {
      setMarkingId(id);
      await markImportFailed(id);
      await fetchRuns();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark run.';
      setError(message);
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="admin-shell">
      <div className="admin-row" style={{ justifyContent: 'space-between' }}>
        <div className="admin-row">
          <Link href="/admin/imports" className="admin-link active">
            Imports
          </Link>
          <Link href="/admin/orders" className="admin-link">
            Orders
          </Link>
          <Link href="/admin/products" className="admin-link">
            Product Updates
          </Link>
        </div>
      </div>
      <h1>Import Runs</h1>

      <div className="admin-card">
        <form
          onSubmit={onSubmit}
          className="admin-row"
          style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}
        >
          <div className="admin-field" style={{ minWidth: 220 }}>
            <label htmlFor="import-file">CSV file</label>
            <input
              id="import-file"
              className="admin-input"
              type="file"
              accept=".csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError('');
              }}
            />
          </div>
          <div className="admin-field" style={{ minWidth: 180 }}>
            <label htmlFor="price-margin">Profit margin (%)</label>
            <input
              id="price-margin"
              className="admin-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={priceMarginPercent}
              onChange={(event) => {
                setPriceMarginPercent(event.target.value);
                setError('');
              }}
            />
          </div>
          <button className="admin-button" type="submit" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload CSV'}
          </button>
        </form>
        <p className="admin-muted">Margin applies to CSV UnitPrice before import.</p>
        {error ? <p className="admin-muted">{error}</p> : null}
      </div>

      <div className="admin-card">
        <div className="admin-row" style={{ justifyContent: 'space-between' }}>
          <strong>Recent imports</strong>
          <span className="admin-muted">
            {hasActiveRun ? (refreshing ? 'Refreshing...' : 'Auto-refreshing') : 'Idle'}
          </span>
        </div>
        {loading ? (
          <p className="admin-muted">Loading...</p>
        ) : runs.length === 0 ? (
          <p className="admin-muted">No imports yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Created</th>
                <th>Total</th>
                <th>Inserted</th>
                <th>Updated</th>
                <th>Deactivated</th>
                <th>Errors</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const isActive = run.status === 'QUEUED' || run.status === 'RUNNING';
                return (
                  <tr key={run.id}>
                    <td>
                      <Link href={`/admin/imports/${run.id}`} className="text-link">
                        {run.id}
                      </Link>
                    </td>
                    <td>{run.status}</td>
                    <td>{new Date(run.createdAt).toLocaleString()}</td>
                    <td>{run.totalRows}</td>
                    <td>{run.inserted}</td>
                    <td>{run.updated}</td>
                    <td>{run.deactivated}</td>
                    <td>{run.errorCount}</td>
                    <td>
                      {isActive ? (
                        <button
                          type="button"
                          className="admin-button secondary"
                          onClick={() => onMarkFailed(run.id)}
                          disabled={markingId === run.id}
                        >
                          {markingId === run.id ? 'Marking...' : 'Mark failed'}
                        </button>
                      ) : (
                        <span className="admin-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
