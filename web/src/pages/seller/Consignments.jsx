import { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Alert, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { CONSIGNMENT_STATUS, categoryLabel } from '../../constants';
import { StatusTag, fmtTime } from '../../components/common';

export default function SellerConsignments() {
  const [list, setList] = useState([]);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [mine, myRisk] = await Promise.all([
        api.get('/consignments/mine'),
        api.get('/consignments/risk/mine'),
      ]);
      setList(mine);
      setRisk(myRisk);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  return (
    <Card
      title="我的寄卖"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/seller/new')}>
          提交寄卖
        </Button>
      }
    >
      {risk && risk.score > 0 && (
        <Alert
          style={{ marginBottom: 16 }}
          type={risk.strict ? 'warning' : 'info'}
          showIcon
          message={
            risk.strict
              ? `您的历史记录（反悔 ${risk.regretCount} 次、描述不符 ${risk.mismatchCount} 次、售后争议 ${risk.disputeCount} 次）已触发严格验真：后续寄卖需估价师逐项核验。`
              : `历史记录：反悔 ${risk.regretCount} 次、描述不符 ${risk.mismatchCount} 次、售后争议 ${risk.disputeCount} 次。`
          }
        />
      )}
      <Table
        rowKey="id"
        loading={loading}
        dataSource={list}
        pagination={false}
        columns={[
          { title: '申请单号', dataIndex: 'applicationNo', width: 190 },
          { title: '品类', dataIndex: 'category', render: categoryLabel },
          { title: '品牌', dataIndex: 'brand' },
          {
            title: '期望售价',
            dataIndex: 'expectedPrice',
            render: (v) => `¥${Number(v).toLocaleString()}`,
          },
          {
            title: '寄卖价/最低成交价',
            render: (_, r) =>
              r.appraisal
                ? `¥${r.appraisal.consignmentPrice} / ¥${r.appraisal.minPrice}`
                : '待估价',
          },
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
          { title: '提交时间', dataIndex: 'createdAt', render: fmtTime },
          {
            title: '操作',
            render: (_, r) => (
              <Button size="small" onClick={() => navigate(`/seller/consignments/${r.id}`)}>
                详情
              </Button>
            ),
          },
        ]}
      />
    </Card>
  );
}
