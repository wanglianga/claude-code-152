import { useEffect, useState } from 'react';
import { Card, Table, Tag, Segmented, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { ISSUE_TYPES, ISSUE_STATUS } from '../../constants';
import { StatusTag, fmtTime } from '../../components/common';

export default function CsIssues() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('open');
  const navigate = useNavigate();

  const load = () => api.get('/issues').then(setList);
  useEffect(() => {
    load();
  }, []);

  const data = filter === 'all' ? list : list.filter((i) => i.status === filter);

  return (
    <Card
      title="异常工单中心"
      extra={
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { label: '待处理', value: 'open' },
            { label: '处理中', value: 'processing' },
            { label: '已解决', value: 'resolved' },
            { label: '全部', value: 'all' },
          ]}
        />
      }
    >
      <Table
        rowKey="id"
        dataSource={data}
        pagination={false}
        onRow={(r) => ({ onClick: () => navigate(`/cs/issues/${r.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: '工单号', dataIndex: 'issueNo', width: 190 },
          { title: '类型', dataIndex: 'type', render: (v) => <Tag color="volcano">{ISSUE_TYPES[v]}</Tag> },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          { title: '发起人', dataIndex: 'raisedByRole', render: (v, r) => r.raisedByUser?.name || v },
          { title: '状态', dataIndex: 'status', render: (v) => <StatusTag map={ISSUE_STATUS} value={v} /> },
          {
            title: '赔付',
            render: (_, r) =>
              r.compensationAmount > 0
                ? `¥${r.compensationAmount}（${{ platform: '平台', seller: '卖家' }[r.compensationBearer] || ''}承担）`
                : '-',
          },
          { title: '发起时间', dataIndex: 'createdAt', render: fmtTime },
        ]}
      />
    </Card>
  );
}
