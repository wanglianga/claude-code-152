import { useEffect, useState } from 'react';
import { Card, Descriptions, Table, Tag, Space } from 'antd';
import { useParams } from 'react-router-dom';
import { api } from '../../api';
import { SETTLEMENT_STATUS, SETTLEMENT_LINE_TYPES, ORDER_STATUS } from '../../constants';
import { StatusTag, Money, fmtTime } from '../../components/common';

const BEARER_LABELS = { platform: '平台', seller: '卖家', buyer: '买家', delivery: '配送方' };

export default function SettlementDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/settlements/${id}`).then(setData);
  }, [id]);

  if (!data) return <Card loading />;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title={`结算单 ${data.settlementNo}`}
        extra={<StatusTag map={SETTLEMENT_STATUS} value={data.status} />}
      >
        <Descriptions bordered size="small" column={4}>
          <Descriptions.Item label="订单号">{data.order?.orderNo}</Descriptions.Item>
          <Descriptions.Item label="商品">{data.item?.listingTitle || data.item?.itemNo}</Descriptions.Item>
          <Descriptions.Item label="订单状态">
            {data.order && <StatusTag map={ORDER_STATUS} value={data.order.status} />}
          </Descriptions.Item>
          <Descriptions.Item label="生成时间">{fmtTime(data.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="成交价"><Money value={data.transactionPrice} /></Descriptions.Item>
          <Descriptions.Item label="平台佣金"><Money value={data.commissionAmount} /></Descriptions.Item>
          <Descriptions.Item label="翻新费"><Money value={data.refurbishmentCost} /></Descriptions.Item>
          <Descriptions.Item label="仓储费"><Money value={data.storageFee} /></Descriptions.Item>
          <Descriptions.Item label="配送费"><Money value={data.deliveryFee} /></Descriptions.Item>
          <Descriptions.Item label="售后赔付"><Money value={data.afterSalesCompensation} /></Descriptions.Item>
          <Descriptions.Item label="卖家实收">
            <span style={{ color: '#b03a2e', fontWeight: 700 }}><Money value={data.sellerPayout} /></span>
          </Descriptions.Item>
          <Descriptions.Item label="平台净收入">
            <span style={{ color: '#237804', fontWeight: 700 }}><Money value={data.platformRevenue} /></span>
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="费用明细（每一笔都有来源）">
        <Table
          rowKey="id"
          dataSource={data.lines}
          pagination={false}
          columns={[
            {
              title: '费用类型',
              dataIndex: 'type',
              render: (v) => <Tag>{SETTLEMENT_LINE_TYPES[v] || v}</Tag>,
            },
            {
              title: '方向',
              dataIndex: 'direction',
              render: (v) => (v === 'credit' ? <Tag color="green">收入</Tag> : <Tag color="red">支出</Tag>),
            },
            { title: '金额', dataIndex: 'amount', render: (v) => <Money value={v} /> },
            { title: '承担/来源方', dataIndex: 'bearer', render: (v) => BEARER_LABELS[v] || v },
            { title: '费用说明', dataIndex: 'description' },
            { title: '来源单据', dataIndex: 'sourceRef' },
          ]}
        />
      </Card>
    </Space>
  );
}
