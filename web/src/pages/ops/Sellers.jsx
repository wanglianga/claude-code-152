import { useEffect, useState } from 'react';
import { Card, Table, Tag, Alert } from 'antd';
import { api } from '../../api';

export default function OpsSellers() {
  const [list, setList] = useState([]);

  useEffect(() => {
    api.get('/analytics/sellers').then(setList);
  }, []);

  return (
    <Card title="卖家信用与风险（历史反悔 / 描述不符 / 售后争议 → 严格验真）">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="风险评分 = 反悔×2 + 描述不符×2 + 售后争议×1，≥2 分的卖家再次寄卖时将强制严格上门验真。"
      />
      <Table
        rowKey="sellerId"
        dataSource={list}
        pagination={false}
        columns={[
          { title: '卖家', dataIndex: 'name' },
          { title: '账号', dataIndex: 'username' },
          { title: '寄卖次数', dataIndex: 'consignmentCount' },
          { title: '反悔', dataIndex: 'regretCount', render: (v) => v > 0 ? <Tag color="red">{v}</Tag> : v },
          { title: '描述不符', dataIndex: 'mismatchCount', render: (v) => v > 0 ? <Tag color="red">{v}</Tag> : v },
          { title: '售后争议', dataIndex: 'disputeCount', render: (v) => v > 0 ? <Tag color="orange">{v}</Tag> : v },
          {
            title: '风险评分',
            dataIndex: 'score',
            sorter: (a, b) => a.score - b.score,
            render: (v) => <b style={{ color: v >= 2 ? '#cf1322' : undefined }}>{v}</b>,
          },
          {
            title: '验真策略',
            dataIndex: 'strict',
            render: (v) => (v ? <Tag color="volcano">严格上门验真</Tag> : <Tag color="green">常规验真</Tag>),
          },
        ]}
      />
    </Card>
  );
}
