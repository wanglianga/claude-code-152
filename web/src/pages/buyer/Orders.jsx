import { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Select, Input, message, Tag } from 'antd';
import { api } from '../../api';
import { ORDER_STATUS, categoryLabel, vehicleLabel } from '../../constants';
import { StatusTag, Money, fmtTime } from '../../components/common';

export default function BuyerOrders() {
  const [list, setList] = useState([]);
  const [issueFor, setIssueFor] = useState(null);
  const [form] = Form.useForm();

  const load = () => api.get('/orders/mine').then(setList);
  useEffect(() => {
    load();
  }, []);

  const confirm = async (id) => {
    try {
      await api.post(`/orders/${id}/confirm`);
      message.success('已确认收货，交易完成');
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  const raiseIssue = async (values) => {
    try {
      await api.post('/issues', { ...values, orderId: issueFor.id });
      message.success('售后申请已提交，客服将尽快处理');
      setIssueFor(null);
      form.resetFields();
    } catch (e) {
      message.error(e.message);
    }
  };

  return (
    <Card title="我的订单">
      <Table
        rowKey="id"
        dataSource={list}
        pagination={false}
        columns={[
          { title: '订单号', dataIndex: 'orderNo', width: 190 },
          {
            title: '商品',
            render: (_, r) => (
              <Space direction="vertical" size={0}>
                <span>{r.item?.listingTitle}</span>
                <span style={{ color: '#999', fontSize: 12 }}>
                  {categoryLabel(r.consignment?.category)} · {r.consignment?.brand}
                </span>
              </Space>
            ),
          },
          { title: '成交价', dataIndex: 'price', render: (v) => <Money value={v} /> },
          { title: '配送费', dataIndex: 'deliveryFee', render: (v) => <Money value={v} /> },
          {
            title: '交付条件',
            render: (_, r) => (
              <Space size={4} wrap>
                <Tag>{r.floor}楼{r.hasElevator ? '/有电梯' : '/无电梯'}</Tag>
                {r.needDisassembly && <Tag>拆装</Tag>}
                {r.needOldFurnitureRemoval && <Tag>旧家具搬出</Tag>}
                <Tag>{vehicleLabel(r.vehicleType)}</Tag>
              </Space>
            ),
          },
          { title: '预约时间', dataIndex: 'appointmentAt', render: fmtTime },
          { title: '状态', dataIndex: 'status', render: (v) => <StatusTag map={ORDER_STATUS} value={v} /> },
          {
            title: '操作',
            width: 220,
            render: (_, r) => (
              <Space>
                {r.status === 'delivered' && (
                  <Button size="small" type="primary" onClick={() => confirm(r.id)}>
                    确认收货
                  </Button>
                )}
                {['paid', 'scheduled', 'delivering', 'delivered'].includes(r.status) && (
                  <Button size="small" danger onClick={() => setIssueFor(r)}>
                    售后/问题
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={`售后申请 · ${issueFor?.orderNo ?? ''}`}
        open={!!issueFor}
        onCancel={() => setIssueFor(null)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={raiseIssue} initialValues={{ type: 'color_difference' }}>
          <Form.Item name="type" label="问题类型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'color_difference', label: '色差明显' },
                { value: 'delivery_damage', label: '配送磕碰损坏' },
                { value: 'return_request', label: '要求退货' },
                { value: 'other', label: '其他问题' },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label="问题描述" rules={[{ required: true, message: '请描述问题' }]}>
            <Input.TextArea rows={3} placeholder="请描述具体情况，客服将协同仓库/配送/卖家处理" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
