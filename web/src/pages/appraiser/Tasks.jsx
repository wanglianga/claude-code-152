import { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Space, Modal, DatePicker, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { api } from '../../api';
import { CONSIGNMENT_STATUS, categoryLabel } from '../../constants';
import { StatusTag, fmtTime } from '../../components/common';

export default function AppraiserTasks() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduleFor, setScheduleFor] = useState(null);
  const [appointmentAt, setAppointmentAt] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      setList(await api.get('/consignments'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const pending = list.filter((c) => ['pending_appraisal', 'scheduled'].includes(c.status));

  const saveSchedule = async () => {
    if (!appointmentAt) return message.warning('请选择上门时间');
    try {
      await api.post(`/consignments/${scheduleFor.id}/schedule`, {
        appointmentAt: appointmentAt.toISOString(),
      });
      message.success('已预约');
      setScheduleFor(null);
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  return (
    <Card title={`估价任务（待处理 ${pending.length}）`}>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={pending}
        pagination={false}
        columns={[
          { title: '申请单号', dataIndex: 'applicationNo', width: 190 },
          { title: '品类', dataIndex: 'category', render: categoryLabel },
          { title: '品牌/材质', render: (_, r) => `${r.brand} / ${r.material}` },
          { title: '卖家', dataIndex: 'sellerName' },
          { title: '地址', dataIndex: 'address', ellipsis: true },
          {
            title: '状态',
            dataIndex: 'status',
            render: (v, r) => (
              <Space size={4}>
                <StatusTag map={CONSIGNMENT_STATUS} value={v} />
                {r.requiresStrictVerification && <Tag color="volcano">严格验真</Tag>}
              </Space>
            ),
          },
          { title: '预约上门', dataIndex: 'appointmentAt', render: fmtTime },
          {
            title: '操作',
            width: 200,
            render: (_, r) => (
              <Space>
                <Button size="small" onClick={() => { setScheduleFor(r); setAppointmentAt(null); }}>
                  预约
                </Button>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => navigate(`/appraiser/appraise/${r.id}`)}
                >
                  上门估价
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={`预约上门 · ${scheduleFor?.applicationNo ?? ''}`}
        open={!!scheduleFor}
        onCancel={() => setScheduleFor(null)}
        onOk={saveSchedule}
      >
        <DatePicker
          showTime
          style={{ width: '100%' }}
          value={appointmentAt}
          onChange={setAppointmentAt}
          disabledDate={(d) => d && d < dayjs().startOf('day')}
        />
      </Modal>
    </Card>
  );
}
