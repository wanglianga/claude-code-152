import { useEffect, useState } from 'react';
import { api } from '../api';
import {
  Badge, Modal, Field, Money, Empty, toast,
} from '../ui';
import { DELIVERY_STATUS, FAIL_REASON, ORDER_STATUS, CATEGORY } from '../labels';

export function DeliveryView() {
  const [queue, setQueue] = useState<any[]>([]);
  const [orders, setOrders] = useState<Record<string, any>>({});
  const [items, setItems] = useState<any[]>([]);
  const [scheduleFor, setScheduleFor] = useState<any>(null);
  const [failFor, setFailFor] = useState<any>(null);

  const load = async () => {
    const q = await api('/deliveries/queue');
    setQueue(q);
    const os = await api('/orders');
    setOrders(Object.fromEntries(os.map((o: any) => [o.id, o])));
    setItems(await api('/items'));
  };
  useEffect(() => {
    load();
  }, []);

  const act = async (orderId: string, action: string, body?: any, msg?: string) => {
    try {
      await api(`/deliveries/${orderId}/${action}`, body ? { body } : {});
      if (msg) toast(msg);
      load();
    } catch (e: any) {
      toast(e.message, true);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>配送调度</h2>
          <div className="sub">综合楼层、电梯、拆装、车辆、旧家具搬出与预约时间安排交付；失败必须记录原因（计入品类失败率）</div>
        </div>
      </div>
      {queue.length === 0 ? (
        <Empty text="暂无待安排/异常配送任务" />
      ) : (
        <div className="grid grid-2">
          {queue.map((d) => {
            const order = orders[d.orderId];
            const item = items.find((i) => i.id === order?.itemId);
            return (
              <div className="card" key={d.id}>
                <h3>
                  订单 {order?.code || '?'}
                  {order && <span style={{ marginLeft: 8 }}><Badge map={ORDER_STATUS} value={order.status} /></span>}
                  <span style={{ marginLeft: 8 }}><Badge map={DELIVERY_STATUS} value={d.status} /></span>
                </h3>
                <div style={{ marginBottom: 6 }}>
                  {item && <b>{CATEGORY[item.category]} · {item.title}</b>}
                </div>
                <dl className="kv">
                  <dt>提货</dt>
                  <dd>{d.pickupFloor} 层 · {d.pickupElevator === 'ELEVATOR' ? '有电梯' : '无电梯'} · {d.needsDisassembly ? '需拆装' : '无需拆装'}</dd>
                  <dt>送达</dt>
                  <dd>{order?.buyerAddress || '-'} · {d.dropoffFloor} 层 · {d.dropoffElevator === 'ELEVATOR' ? '有电梯' : '无电梯'}</dd>
                  <dt>车辆</dt><dd>{d.vehicleType}</dd>
                  <dt>旧家具搬出</dt><dd>{d.oldFurnitureRemoval ? '是' : '否'}</dd>
                  <dt>预约时间</dt><dd>{d.scheduledWindow || '未预约'}</dd>
                  <dt>配送费</dt><dd>{order && <Money v={order.deliveryFee} />}</dd>
                  {d.status === 'FAILED' && (
                    <>
                      <dt>失败原因</dt>
                      <dd><span className="badge red">{FAIL_REASON[d.failReason]}</span> {d.failNote}</dd>
                    </>
                  )}
                </dl>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {['PENDING', 'FAILED'].includes(d.status) && (
                    <button className="btn sm" onClick={() => setScheduleFor(d)}>安排车辆/预约</button>
                  )}
                  {d.status === 'SCHEDULED' && (
                    <button className="btn sm" onClick={() => act(d.orderId, 'load', undefined, '已装车出库')}>装车出库</button>
                  )}
                  {['LOADED', 'SCHEDULED'].includes(d.status) && (
                    <>
                      <button className="btn ghost sm" onClick={() => act(d.orderId, 'done', { note: '' }, '已确认送达')}>正常送达</button>
                      <button className="btn danger sm" onClick={() => setFailFor(d)}>配送失败</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {scheduleFor && (
        <ScheduleModal delivery={scheduleFor} onClose={() => setScheduleFor(null)} onDone={() => { setScheduleFor(null); load(); }} />
      )}
      {failFor && (
        <FailModal delivery={failFor} onClose={() => setFailFor(null)} onDone={() => { setFailFor(null); load(); }} />
      )}
    </div>
  );
}

function ScheduleModal({ delivery, onClose, onDone }: { delivery: any; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    vehicleType: delivery.vehicleType || 'SMALL_VAN',
    scheduledWindow: delivery.scheduledWindow || '',
  });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.scheduledWindow) return toast('请填写预约时间段', true);
    setBusy(true);
    try {
      await api(`/deliveries/${delivery.orderId}/schedule`, { body: f });
      toast('排班成功');
      onDone();
    } catch (e: any) {
      toast(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="安排配送"
      onClose={onClose}
      footer={
        <>
          <button className="btn gray" onClick={onClose}>取消</button>
          <button className="btn" disabled={busy} onClick={submit}>确认排班</button>
        </>
      }
    >
      <Field label="车辆类型（按体积/拆装选择）">
        <select value={f.vehicleType} onChange={(e) => setF({ ...f, vehicleType: e.target.value })}>
          <option value="SMALL_VAN">小面包车（椅/书柜等小件）</option>
          <option value="MID_TRUCK">中货车（餐桌/儿童床）</option>
          <option value="LARGE_TRUCK">大货车（沙发/大柜，建议跟车 2 人）</option>
        </select>
      </Field>
      <Field label="预约时间段">
        <input placeholder="如 10-06 14:00-16:00" value={f.scheduledWindow} onChange={(e) => setF({ ...f, scheduledWindow: e.target.value })} />
      </Field>
      <div className="banner warn">
        提示：提货 {delivery.pickupFloor} 层（{delivery.pickupElevator === 'ELEVATOR' ? '电梯' : '无电梯'}）、
        送达 {delivery.dropoffFloor} 层（{delivery.dropoffElevator === 'ELEVATOR' ? '电梯' : '无电梯'}）
        {delivery.needsDisassembly ? '，家具需拆装，请安排翻新师或带工具。' : '。'}
        {delivery.oldFurnitureRemoval ? ' 本单含旧家具搬出。' : ''}
      </div>
    </Modal>
  );
}

function FailModal({ delivery, onClose, onDone }: { delivery: any; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ failReason: 'ELEVATOR_TOO_SMALL', failNote: '' });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api(`/deliveries/${delivery.orderId}/fail`, { body: f });
      toast('已记录失败，可到协同工单发起客服介入');
      onDone();
    } catch (e: any) {
      toast(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="登记配送失败"
      onClose={onClose}
      footer={
        <>
          <button className="btn gray" onClick={onClose}>取消</button>
          <button className="btn danger" disabled={busy} onClick={submit}>确认失败</button>
        </>
      }
    >
      <Field label="失败原因（进入品类配送失败率统计）">
        <select value={f.failReason} onChange={(e) => setF({ ...f, failReason: e.target.value })}>
          {Object.entries(FAIL_REASON).filter(([k]) => k !== 'NONE').map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </Field>
      <Field label="现场情况说明">
        <textarea style={{ minHeight: 90 }} value={f.failNote} onChange={(e) => setF({ ...f, failNote: e.target.value })}
          placeholder="如：电梯进深 1.4m，沙发 2.4m 不可拆装；建议同步发起协同工单" />
      </Field>
    </Modal>
  );
}
