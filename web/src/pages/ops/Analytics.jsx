import { useEffect, useState } from 'react';
import { Card, Table, Tag, Row, Col, Statistic, Progress, Space } from 'antd';
import { api } from '../../api';
import { ISSUE_TYPES } from '../../constants';

export default function OpsAnalytics() {
  const [stats, setStats] = useState([]);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    api.get('/analytics/categories').then(setStats);
    api.get('/analytics/overview').then(setOverview);
  }, []);

  const reasonSummary = (reasons) => {
    if (!reasons || reasons.length === 0) return '-';
    const counts = {};
    reasons.forEach((r) => {
      counts[r] = (counts[r] || 0) + 1;
    });
    return (
      <Space size={4} wrap>
        {Object.entries(counts).map(([k, v]) => (
          <Tag key={k} color="orange">{`${ISSUE_TYPES[k] || k}×${v}`}</Tag>
        ))}
      </Space>
    );
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {overview && (
        <Row gutter={16}>
          <Col span={4}><Card><Statistic title="寄卖申请" value={overview.consignmentCount} suffix="件" /></Card></Col>
          <Col span={4}><Card><Statistic title="在售商品" value={overview.listedCount} suffix="件" /></Card></Col>
          <Col span={4}><Card><Statistic title="累计订单" value={overview.orderCount} suffix="单" /></Card></Col>
          <Col span={4}><Card><Statistic title="待处理工单" value={overview.openIssueCount} suffix="件" valueStyle={{ color: overview.openIssueCount > 0 ? '#cf1322' : undefined }} /></Card></Col>
          <Col span={8}><Card><Statistic title="已完成交易额 (GMV)" value={overview.gmv} precision={2} prefix="¥" /></Card></Col>
        </Row>
      )}
      <Card title="品类运营分析（成交周期 / 翻新投入 / 退货率 / 配送失败率 → 入仓或自提建议）">
        <Table
          rowKey="category"
          dataSource={stats}
          pagination={false}
          columns={[
            { title: '品类', dataIndex: 'categoryLabel' },
            { title: '寄卖数', dataIndex: 'consignmentCount' },
            { title: '在售', dataIndex: 'listedCount' },
            { title: '成交', dataIndex: 'soldCount' },
            {
              title: '平均成交周期',
              dataIndex: 'avgCycleDays',
              render: (v) => (v === null ? '-' : `${v} 天`),
              sorter: (a, b) => (a.avgCycleDays ?? 999) - (b.avgCycleDays ?? 999),
            },
            {
              title: '平均翻新投入',
              dataIndex: 'avgRefurbishmentCost',
              render: (v) => `¥${v}`,
            },
            {
              title: '退货率',
              dataIndex: 'returnRate',
              render: (v) => (
                <Progress percent={v} size="small" status={v >= 15 ? 'exception' : 'normal'} style={{ width: 100 }} />
              ),
            },
            {
              title: '配送失败率',
              dataIndex: 'deliveryFailureRate',
              render: (v) => (
                <Progress percent={v} size="small" status={v >= 20 ? 'exception' : 'normal'} style={{ width: 100 }} />
              ),
            },
            {
              title: '退货/售后原因',
              dataIndex: 'returnReasons',
              render: reasonSummary,
            },
            {
              title: '运营建议',
              dataIndex: 'recommendation',
              render: (v) => (
                <Tag color={v.includes('入仓') ? 'green' : v.includes('自提') ? 'orange' : 'default'}>
                  {v}
                </Tag>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
