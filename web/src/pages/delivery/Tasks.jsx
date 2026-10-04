import { useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Select, Input, DatePicker, message, Tag, Tabs,
} from 'antd';
import dayjs from 'dayjs';
import { api, getUser } from '../../api';
import { DELIVERY_STATUS, ORDER_STATUS, VEHICLE_TYPES, vehicleLabel, categoryLabel } from '../../constants';
import { StatusTag, Money, fmtTime } from '../../components/common';

export default function DeliveryTasks() {
  const [tasks, setTasks] = useState([]);
  const [paidOrders, setPaidOrders] = useState([]);
  const [scheduleFor, setScheduleFor] = useState(null);
  const [failFor, setFailFor] = useState(null);
  const [scheduleForm] = Form.useForm();
  const [failForm] = Form.useForm();
  const user = getUser();

  const load = async () => {
    const [t, orders] = await Promise.all([
      api.get('/delivery/tasks'),
      api.get('/orders?status=paid'),
    ]);
    setTasks(t);
    setPaidOrders(orders);
  };
  useEffect(() => {
    load();
  }, []);

  const doSchedule = async (values) => {
    try {
      await api.post('/delivery/schedule', {
        orderId: scheduleFor.id,
        courierId: user.id,
        vehicleType: values.vehicleType,
        scheduledAt: values.scheduledAt?.toISOString(),
        notes: values.notes,
      });
      message.success('已创建配送任务');
      setScheduleFor(null);
      scheduleForm.resetFields();
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  const action = async (path, successMsg) => {
    try {
      await api.post(path);
      message.success(successMsg);
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  const doFail = async (values) => {
    try {
      await api.post(`/delivery/tasks/${failFor.id}/fail`, values);
      message.success('已上报配送失败，客服将介入协调');
      setFailFor(null);
      failForm.resetFields();
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  return (
    <Card title="配送中心">
      <Tabs
        items={[
          {
            key: 'todo',
            label: `待调度订单 (${paidOrders.length})`,
            children: (
              <Table
                rowKey="id"
                dataSource={paidOrders}
                pagination={false}
                columns={[
                  { title: '订单号', dataIndex: 'orderNo', width: 190 },
                  { title: '商品', render: (_, r) => r.item?.listingTitle },
                  { title: '收货地址', dataIndex: 'address', ellipsis: true },
                  {
                    title: '交付条件',
                    render: (_, r) => (
                      <Space size={4} wrap>
                        <Tag>{r.floor}楼{r.hasElevator ? '/电梯' : '/无电梯'}</Tag>
                        {r.needDisassembly && <Tag color="orange">拆装</Tag>}
                        {r.needOldFurnitureRemoval && <Tag color="orange">旧家具搬出</Tag>}
                        <Tag>{vehicleLabel(r.vehicleType)}</Tag>
                      </Space>
                    ),
                  },
                  { title: '预约时间', dataIndex: 'appointmentAt', render: fmtTime },
                  { title: '配送费', dataIndex: 'deliveryFee', render: (v) => <Money value={v} /> },
                  {
                    title: '操作',
                    render: (_, r) => (
                      <Button size="small" type="primary" onClick={() => setScheduleFor(r)}>
                        安排配送
                      </Button>
                    ),
                  },
                ]}
              />
            ),
          },
          {
            key: 'tasks',
            label: `配送任务 (${tasks.length})`,
            children: (
              <Table
                rowKey="id"
                dataSource={tasks}
                pagination={false}
                columns={[
                  { title: '任务#', dataIndex: 'id', width: 70 },
                  { title: '订单号', render: (_, r) => r.order?.orderNo, width: 190 },
                  { title: '商品', render: (_, r) => r.item?.listingTitle },
                  { title: '地址', render: (_, r) => r.order?.address, ellipsis: true },
                  { title: '车型', dataIndex: 'vehicleType', render: vehicleLabel },
                  { title: '计划时间', dataIndex: 'scheduledAt', render: fmtTime },
                  { title: '配送员', dataIndex: 'courierName' },
                  { title: '状态', dataIndex: 'status', render: (v) => <StatusTag map={DELIVERY_STATUS} value={v} /> },
                  { title: '失败原因', dataIndex: 'failureReason', ellipsis: true },
                  {
                    title: '操作',
                    width: 240,
                    render: (_, r) => (
                      <Space>
                        {r.status === 'scheduled' && (
                          <Button size="small" onClick={() => action(`/delivery/tasks/${r.id}/start`, '已出发')}>
                            出发
                          </Button>
                        )}
                        {['scheduled', 'en_route'].includes(r.status) && (
                          <>
                            <Button
                              size="small"
                              type="primary"
                              onClick={() => action(`/delivery/tasks/${r.id}/complete`, '已送达')}
                            >
                              送达
                            </Button>
                            <Button size="small" danger onClick={() => setFailFor(r)}>
                              配送失败
                            </Button>
                          </>
                        )}
                      </Space>
                    ),
                  },
                ]}
              />
            ),
          },
        ]}
      />

      <Modal
        title={`安排配送 · ${scheduleFor?.orderNo ?? ''}`}
        open={!!scheduleFor}
        onCancel={() => setScheduleFor(null)}
        onOk={() => scheduleForm.submit()}
      >
        <Form
          form={scheduleForm}
          layout="vertical"
          onFinish={doSchedule}
          initialValues={{
            vehicleType: scheduleFor?.vehicleType || 'medium_truck',
            scheduledAt: scheduleFor?.appointmentAt ? dayjs(scheduleFor.appointmentAt) : dayjs().add(1, 'day'),
          }}
        >
          <Form.Item name="vehicleType" label="车型" rules={[{ required: true }]}>
            <Select options={VEHICLE_TYPES} />
          </Form.Item>
          <Form.Item name="scheduledAt" label="配送时间" rules={[{ required: true, message: '请选择' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="如：无电梯需两人搬运、需拆装工具" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="上报配送失败"
        open={!!failFor}
        onCancel={() => setFailFor(null)}
        onOk={() => failForm.submit()}
      >
        <Form form={failForm} layout="vertical" onFinish={doFail} initialValues={{ issueType: 'elevator_unfit' }}>
          <Form.Item name="issueType" label="失败类型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'elevator_unfit', label: '无法进电梯/楼道' },
                { value: 'delivery_damage', label: '运输途中磕碰损坏' },
                { value: 'other', label: '其他原因' },
              ]}
            />
          </Form.Item>
          <Form.Item name="reason" label="失败原因说明" rules={[{ required: true, message: '请填写原因' }]}>
            <Input.TextArea rows={3} placeholder="如：沙发长2.1m无法进电梯，需吊装或拆装" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
