import { useEffect, useState } from 'react';
import { Card, Table, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { SETTLEMENT_STATUS } from '../../constants';
import { StatusTag, Money, fmtTime } from '../../components/common';

export default function SellerSettlements() {
  const [list, setList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/settlements/mine').then(setList);
  }, []);

  return (
    <Card title="我的结算">
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
          { title: '售后赔付', dataIndex: 'afterSalesCompensation', render: (v) => <Money value={v} /> },
          {
            title: '我的实收',
            dataIndex: 'sellerPayout',
            render: (v) => <span style={{ color: '#b03a2e', fontWeight: 700 }}><Money value={v} /></span>,
          },
          { title: '状态', dataIndex: 'status', render: (v) => <StatusTag map={SETTLEMENT_STATUS} value={v} /> },
          { title: '时间', dataIndex: 'createdAt', render: fmtTime },
        ]}
      />
    </Card>
  );
}
