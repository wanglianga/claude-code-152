import { useEffect, useState } from 'react';
import {
  Card, Descriptions, Tag, Space, Button, Timeline, Form, Select, Input, InputNumber,
  message, Alert, Divider,
} from 'antd';
import { useParams } from 'react-router-dom';
import { api } from '../../api';
import {
  ISSUE_TYPES, ISSUE_STATUS, CONSIGNMENT_STATUS, ITEM_STATUS, ORDER_STATUS, categoryLabel,
} from '../../constants';
import { StatusTag, Money, fmtTime } from '../../components/common';

// 各工单类型可选的处置动作
const ACTIONS = {
  seller_regret: [
    { value: 'confirm', label: '确认反悔：取消寄卖/订单，商品退回卖家' },
    { value: 'reject', label: '反悔不成立：恢复上架继续寄卖' },
  ],
  appraisal_mismatch: [
    { value: 'reappraise', label: '退回重新估价（严格验真）' },
    { value: 'adjust_price', label: '维持寄卖，仓库调整上架价' },
    { value: 'off_shelf', label: '直接下架' },
  ],
  refurbishment_overrun: [
    { value: 'seller_bears', label: '超支由卖家承担' },
    { value: 'platform_bears', label: '超支由平台承担' },
    { value: 'share', label: '平台与卖家分摊' },
  ],
  color_difference: [
    { value: 'compensate', label: '赔付买家，订单继续履约' },
    { value: 'approve_return', label: '同意退货退款，商品重新上架' },
    { value: 'reject', label: '诉求不成立，订单正常完结' },
  ],
  delivery_damage: [
    { value: 'compensate', label: '赔付买家，订单继续履约' },
    { value: 'repair', label: '退货退款，商品回库修复' },
    { value: 'approve_return', label: '同意退货退款，商品重新上架' },
  ],
  elevator_unfit: [
    { value: 'reschedule', label: '重新调度（拆装/大车/吊装）' },
    { value: 'cancel_order', label: '取消订单并退款' },
  ],
  return_request: [
    { value: 'approve_return', label: '同意退货退款，商品重新上架' },
    { value: 'reject', label: '拒绝退货，订单正常完结' },
  ],
  other: [{ value: 'close', label: '记录并关闭' }],
};

export default function CsIssueDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [note, setNote] = useState('');
  const [form] = Form.useForm();

  const load = () => api.get(`/issues/${id}`).then(setData);
  useEffect(() => {
    load();
  }, [id]);

  if (!data) return <Card loading />;
  const c = data.consignment || {};
  const item = data.item || {};
  const order = data.order;
  const resolved = ['resolved', 'closed'].includes(data.status);

  const claim = async () => {
    await api.post(`/issues/${id}/claim`);
    message.success('已接手');
    load();
  };

  const addNote = async () => {
    if (!note.trim()) return;
    await api.post(`/issues/${id}/progress`, { note });
    setNote('');
    load();
  };

  const resolve = async (values) => {
    try {
      await api.post(`/issues/${id}/resolve`, values);
      message.success('工单已结案，相关单据已自动联动');
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card
          title={`工单 ${data.issueNo}`}
          extra={<StatusTag map={ISSUE_STATUS} value={data.status} />}
        >
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="类型">
              <Tag color="volcano">{ISSUE_TYPES[data.type]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="发起时间">{fmtTime(data.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="问题描述" span={2}>{data.description}</Descriptions.Item>
            {data.resolution && (
              <>
                <Descriptions.Item label="处理结论" span={2}>{data.resolution}</Descriptions.Item>
                <Descriptions.Item label="赔付">
                  {data.compensationAmount > 0 ? (
                    <Money value={data.compensationAmount} />
                  ) : '无'}
                  {data.compensationAmount > 0 &&
                    `（${{ platform: '平台承担', seller: '卖家承担' }[data.compensationBearer]}）`}
                </Descriptions.Item>
                <Descriptions.Item label="处置动作">{data.resolutionAction}</Descriptions.Item>
              </>
            )}
          </Descriptions>
          {!resolved && (
            <Space style={{ marginTop: 16 }}>
              {data.status === 'open' && (
                <Button type="primary" onClick={claim}>接手处理</Button>
              )}
            </Space>
          )}
        </Card>

        <Card title="关联家具与单据（同一家具全链路）">
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="寄卖单">{c.applicationNo}</Descriptions.Item>
            <Descriptions.Item label="寄卖状态">
              <StatusTag map={CONSIGNMENT_STATUS} value={c.status} />
            </Descriptions.Item>
            <Descriptions.Item label="家具">
              {categoryLabel(c.category)} · {c.brand}
            </Descriptions.Item>
            <Descriptions.Item label="库存状态">
              {item.status ? <StatusTag map={ITEM_STATUS} value={item.status} /> : '-'}
            </Descriptions.Item>
            {order && (
              <>
                <Descriptions.Item label="订单号">{order.orderNo}</Descriptions.Item>
                <Descriptions.Item label="订单状态">
                  <StatusTag map={ORDER_STATUS} value={order.status} />
                </Descriptions.Item>
                <Descriptions.Item label="成交价"><Money value={order.price} /></Descriptions.Item>
                <Descriptions.Item label="收货地址">{order.address}</Descriptions.Item>
              </>
            )}
          </Descriptions>
        </Card>

        {!resolved && (
          <Card title="结案处置">
            <Form form={form} layout="vertical" onFinish={resolve} initialValues={{ compensationAmount: 0, compensationBearer: 'none' }}>
              <Form.Item name="action" label="处置动作" rules={[{ required: true, message: '请选择处置动作' }]}>
                <Select options={ACTIONS[data.type] || ACTIONS.other} placeholder="选择联动动作" />
              </Form.Item>
              <Form.Item name="resolution" label="处理结论" rules={[{ required: true, message: '请填写结论' }]}>
                <Input.TextArea rows={2} placeholder="将同步给卖家/买家/仓库/配送" />
              </Form.Item>
              <Space size={16}>
                <Form.Item name="compensationAmount" label="售后赔付金额 (元)">
                  <InputNumber min={0} style={{ width: 160 }} />
                </Form.Item>
                <Form.Item name="compensationBearer" label="赔付承担方">
                  <Select
                    style={{ width: 160 }}
                    options={[
                      { value: 'none', label: '无赔付' },
                      { value: 'platform', label: '平台承担' },
                      { value: 'seller', label: '卖家承担' },
                    ]}
                  />
                </Form.Item>
              </Space>
              <Button type="primary" htmlType="submit">提交结案</Button>
            </Form>
          </Card>
        )}
      </Space>

      <Card title="协同时间线">
        <Timeline
          items={(data.events || []).map((e) => ({
            children: (
              <div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {fmtTime(e.createdAt)} · {e.actorName}（{e.actorRole}）
                </div>
                <div>{e.content}</div>
              </div>
            ),
          }))}
        />
        {!resolved && (
          <>
            <Divider plain>添加协同记录</Divider>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="如：已联系仓库核实情况"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onPressEnter={addNote}
              />
              <Button onClick={addNote}>记录</Button>
            </Space.Compact>
          </>
        )}
      </Card>
    </div>
  );
}
