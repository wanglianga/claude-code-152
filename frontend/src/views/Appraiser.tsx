import { useEffect, useState } from 'react';
import { api } from '../api';
import {
  Badge, Modal, Field, Money, Empty, toast,
} from '../ui';
import { CATEGORY, ELEVATOR, CONSIGNMENT_STATUS } from '../labels';
import { ConsignmentDetail } from './ConsignmentDetail';

export function AppraiserView() {
  const [queue, setQueue] = useState<any[]>([]);
  const [appraiseId, setAppraiseId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = () => {
    api('/appraisals/queue/pending').then(setQueue);
  };
  useEffect(() => {
    load();
  }, []);

  if (detailId) {
    return <ConsignmentDetail id={detailId} onBack={() => setDetailId(null)} viewerRole="APPRAISER" />;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>上门估价工作台</h2>
          <div className="sub">
            检查结构、污渍、异味、虫蛀、板材变形与搬运难度；系统已将 <b>严格验真</b> 的高风险卖家申请置顶
          </div>
        </div>
      </div>
      {queue.length === 0 ? (
        <Empty text="暂无待估价申请" />
      ) : (
        <div className="grid grid-2">
          {queue.map((c) => (
            <div className="card" key={c.id}>
              <h3>
                {CATEGORY[c.category]} · {c.brand}
                {c.verificationLevel === 'STRICT' && (
                  <span className="badge red" style={{ marginLeft: 8 }}>⚠ 严格验真</span>
                )}
              </h3>
              <dl className="kv">
                <dt>单号</dt><dd>{c.code}</dd>
                <dt>卖家申报</dt>
                <dd>{c.sizeText} · {c.material} · 用 {c.yearsUsed} 年 · 期望 <Money v={c.expectedPrice} /></dd>
                <dt>搬运条件</dt>
                <dd>{c.floor} 层 · {ELEVATOR[c.elevator]} · {c.disassemblable ? '可拆装' : '不可拆装'}</dd>
                <dt>地址</dt><dd>{c.address || '-'}</dd>
                <dt>卖家备注</dt><dd>{c.sellerNote || '-'}</dd>
                <dt>瑕疵照片</dt>
                <dd>{c.defectPhotos?.length ? c.defectPhotos.map((p: string, i: number) => (
                  <a key={i} href={p} target="_blank" rel="noreferrer" className="tag">照片{i + 1}</a>
                )) : '无'}</dd>
                <dt>状态</dt><dd><Badge map={CONSIGNMENT_STATUS} value={c.status} /></dd>
              </dl>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  className="btn sm"
                  onClick={async () => {
                    try {
                      await api(`/consignments/${c.id}/schedule`);
                      toast('已预约上门');
                      load();
                    } catch (e: any) {
                      toast(e.message, true);
                    }
                  }}
                >
                  预约上门
                </button>
                <button className="btn ghost sm" onClick={() => setAppraiseId(c.id)}>填写验真估价</button>
                <button className="btn gray sm" onClick={() => setDetailId(c.id)}>查看详情</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {appraiseId && (
        <AppraisalModal
          consignmentId={appraiseId}
          onClose={() => setAppraiseId(null)}
          onDone={() => {
            setAppraiseId(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ScoreField({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <label className="fld">
      <span>{label} <span className="muted" style={{ fontWeight: 400 }}>1 完好 → 5 严重</span></span>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="btn sm"
            style={{
              flex: 1,
              background: value === n ? scoreColor(n) : '#fff',
              borderColor: value === n ? scoreColor(n) : '#cbd2d9',
              color: value === n ? '#fff' : '#52606d',
            }}
          >
            {n}
          </button>
        ))}
      </div>
      {hint && <div className="hint">{hint}</div>}
    </label>
  );
}
function scoreColor(n: number) {
  return ['', '#16a34a', '#84cc16', '#eab308', '#f97316', '#dc2626'][n];
}

function AppraisalModal({ consignmentId, onClose, onDone }: { consignmentId: string; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    structuralScore: 2, stainScore: 2, odorScore: 1, mothScore: 1, warpScore: 1, moveDifficulty: 3,
    consignmentPrice: 0, minDealPrice: 0, commissionRate: 0.15, estimatedRefurbishCost: 0,
    cleaningAdvice: '', refurbishSuggestions: '', matchResult: 'MATCH', matchNote: '',
    decision: 'ACCEPT' as 'ACCEPT' | 'REJECT',
    location: 'WAREHOUSE' as 'WAREHOUSE' | 'SELLER_HOME',
    deliveryRadiusKm: 30,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setErr('');
    if (f.consignmentPrice <= 0 || f.minDealPrice <= 0) {
      setErr('请填写寄卖价与最低成交价');
      return;
    }
    setBusy(true);
    try {
      await api(`/appraisals/consignment/${consignmentId}`, { body: f });
      toast('估价已提交，商品已进入清洁翻新流程');
      onDone();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      wide
      title="上门验真与估价"
      onClose={onClose}
      footer={
        <>
          <button className="btn gray" onClick={onClose}>取消</button>
          <button className="btn danger" disabled={busy} onClick={() => { set('decision', 'REJECT'); setTimeout(submit, 0); }}>
            不符合寄卖（拒收）
          </button>
          <button className="btn" disabled={busy} onClick={() => { set('decision', 'ACCEPT'); setTimeout(submit, 0); }}>
            接受寄卖并生成商品
          </button>
        </>
      }
    >
      <div className="grid grid-2">
        <ScoreField label="结构检查" value={f.structuralScore} onChange={(n) => set('structuralScore', n)} hint="框架、承重、连接件" />
        <ScoreField label="污渍" value={f.stainScore} onChange={(n) => set('stainScore', n)} />
        <ScoreField label="异味" value={f.odorScore} onChange={(n) => set('odorScore', n)} hint="烟味/宠物/霉味" />
        <ScoreField label="虫蛀" value={f.mothScore} onChange={(n) => set('mothScore', n)} />
        <ScoreField label="板材变形" value={f.warpScore} onChange={(n) => set('warpScore', n)} />
        <ScoreField label="搬运难度" value={f.moveDifficulty} onChange={(n) => set('moveDifficulty', n)} hint="综合楼层、电梯、体积、拆装" />
      </div>

      <div className="row2">
        <Field label="寄卖价（建议挂牌价）">
          <input type="number" value={f.consignmentPrice || ''} onChange={(e) => set('consignmentPrice', +e.target.value)} />
        </Field>
        <Field label="最低成交价（底价，不可高于寄卖价）">
          <input type="number" value={f.minDealPrice || ''} onChange={(e) => set('minDealPrice', +e.target.value)} />
        </Field>
        <Field label="平台佣金比例">
          <select value={f.commissionRate} onChange={(e) => set('commissionRate', +e.target.value)}>
            <option value={0.15}>15%（常规）</option>
            <option value={0.18}>18%（高风险/高搬运难度）</option>
            <option value={0.2}>20%</option>
          </select>
        </Field>
        <Field label="预估翻新成本（元）">
          <input type="number" value={f.estimatedRefurbishCost} onChange={(e) => set('estimatedRefurbishCost', +e.target.value)} />
        </Field>
      </div>
      <div className="row2">
        <Field label="清洁建议">
          <textarea value={f.cleaningAdvice} onChange={(e) => set('cleaningAdvice', e.target.value)} />
        </Field>
        <Field label="翻新建议（补漆/维修等）">
          <textarea value={f.refurbishSuggestions} onChange={(e) => set('refurbishSuggestions', e.target.value)} />
        </Field>
      </div>
      <Field label="估价与卖家描述相符程度（不符将影响卖家下次验真等级）">
        <select value={f.matchResult} onChange={(e) => set('matchResult', e.target.value)}>
          <option value="MATCH">与描述相符</option>
          <option value="MINOR_DIFF">轻微不符</option>
          <option value="MISMATCH">严重不符（材质/成色虚假申报）</option>
        </select>
      </Field>
      <Field label="验真说明">
        <input value={f.matchNote} onChange={(e) => set('matchNote', e.target.value)} placeholder="记录实物与申报差异" />
      </Field>
      <div className="row2">
        <Field label="家具去向">
          <select value={f.location} onChange={(e) => set('location', e.target.value)}>
            <option value="WAREHOUSE">入仓（平台统一清洁/拍照/发货）</option>
            <option value="SELLER_HOME">暂放卖家家中（多为仅同城自提）</option>
          </select>
        </Field>
        <Field label="可配送范围（公里，0=仅同城自提）">
          <input type="number" min={0} value={f.deliveryRadiusKm} onChange={(e) => set('deliveryRadiusKm', +e.target.value)} />
        </Field>
      </div>
      {err && <div className="form-error">{err}</div>}
    </Modal>
  );
}
