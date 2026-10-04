import { useEffect, useState } from 'react';
import { Card, Table, Button, message, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { SETTLEMENT_STATUS } from '../../constants';
import { StatusTag, Money, fmtTime } from '../../components/common';

export default function OpsSettlements() {
  const [list, setList] = useState([]);
  const navigate = useNavigate();

  const load = () => api.get('/settlements').then(setList);
  useEffect(() => {
    load();
  }, []);

  const finalize = async (e, id) => {
    e.stopPropagation();
    try {
      await api.post(`/settlements/${id}/finalize`);
      message.success('已结算');
      load();
    } catch (err) {
      message.error(err.message);
    }
  };

  return (
    <Card title="结算管理">
      <Table
        rowKey="id"
        dataSource={list}
        pagination={false}
        onRow={(r) => ({ onClick: () => navigate(`/ops/settlements/${r.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: '结算单号', dataIndex: 'settlementNo', width: 200 },
          { title: '成交价', dataIndex: 'transactionPrice', render: (v) => <Money value={v} /> },
          { title: '佣金', dataIndex: 'commissionAmount', render: (v) => <Money value={v} /> },
          { title: '翻新费', dataIndex: 'refurbishmentCost', render: (v) => <Money value={v} /> },
          { title: '仓储费', dataIndex: 'storageFee', render: (v) => <Money value={v} /> },
          { title: '配送费', dataIndex: 'deliveryFee', render: (v) => <Money value={v} /> },
          { title: '售后赔付', dataIndex: 'afterSalesCompensation', render: (v) => <Money value={v} /> },
          { title: '卖家实收', dataIndex: 'sellerPayout', render: (v) => <Money value={v} /> },
          { title: '平台净收入', dataIndex: 'platformRevenue', render: (v) => <Money value={v} /> },
          { title: '状态', dataIndex: 'status', render: (v) => <StatusTag map={SETTLEMENT_STATUS} value={v} /> },
          {
            title: '操作',
            render: (_, r) =>
              r.status === 'pending' && (
                <Button size="small" type="primary" onClick={(e) => finalize(e, r.id)}>
                  确认结算
                </Button>
              ),
          },
        ]}
      />
    </Card>
  );
}
