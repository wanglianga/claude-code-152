import React, { useEffect, useState, useCallback } from 'react';

export function Badge({ map, value }: { map: Record<string, { label: string; cls: string }>; value: string }) {
  const m = map[value] || { label: value, cls: 'gray' };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

export function Modal({
  title,
  wide,
  onClose,
  children,
  footer,
}: {
  title: React.ReactNode;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

let toastSeq = 0;
const toastListeners = new Set<(t: { id: number; text: string; err: boolean }) => void>();
export function toast(text: string, err = false) {
  const t = { id: ++toastSeq, text, err };
  toastListeners.forEach((l) => l(t));
}
export function ToastHost() {
  const [items, setItems] = useState<{ id: number; text: string; err: boolean }[]>([]);
  useEffect(() => {
    const l = (t: any) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 3200);
    };
    toastListeners.add(l);
    return () => {
      toastListeners.delete(l);
    };
  }, []);
  return (
    <>
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.err ? 'err' : ''}`}>
          {t.text}
        </div>
      ))}
    </>
  );
}

export function useLoader() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const run = useCallback(async (fn: () => Promise<any>, okMsg?: string, refresh?: () => void) => {
    setError('');
    setLoading(true);
    try {
      await fn();
      if (okMsg) toast(okMsg);
      refresh?.();
      return true;
    } catch (e: any) {
      setError(e.message);
      toast(e.message, true);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);
  return { loading, error, run };
}

export function Empty({ text = '暂无数据' }: { text?: string }) {
  return <div className="empty">{text}</div>;
}

export function ScoreDots({ n }: { n: number }) {
  const colors = ['', '#16a34a', '#84cc16', '#eab308', '#f97316', '#dc2626'];
  return (
    <span title={`评分 ${n}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="score-dot"
          style={{ background: i <= Number(n) ? colors[Number(n)] : '#d1d5db' }}
        >
          {i}
        </span>
      ))}
    </span>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="fld">
      <span>{label}</span>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </label>
  );
}

export function Money({ v, className = '' }: { v: any; className?: string }) {
  const n = Number(v || 0);
  return <span className={className}>¥{n.toFixed(2)}</span>;
}
