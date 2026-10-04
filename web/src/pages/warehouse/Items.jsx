import { useEffect, useState } from 'react';
import { Card, Table, Tag, Space, Segmented } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { ITEM_STATUS, categoryLabel, LOCATION_TYPES } from '../../constants';
import { StatusTag, Money, fmtTime } from '../../components/common';

export default function WarehouseItems() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      setList(await api.get('/inventory/items'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const data = filter === 'all' ? list : list.filter((i) => i.status === filter);

  return (
    <Card
      title="库存与备货管理"
      extra={
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { label: '全部', value: 'all' },
            { label: '备货中', value: 'preparing' },
            { label: '在售', value: 'listed' },
            { label: '已锁定', value: 'reserved' },
            { label: '已下架', value: 'off_shelf' },
          ]}
        />
      }
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={false}
        onRow={(r) => ({ onClick: () => navigate(`/warehouse/items/${r.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: '库存编号', dataIndex: 'itemNo', width: 180 },
          { title: '品类', render: (_, r) => categoryLabel(r.consignment?.category) },
          { title: '品牌', render: (_, r) => r.consignment?.brand },
          {
            title: '存放',
            dataIndex: 'locationType',
            render: (v, r) => (
              <Space size={4}>
                <Tag>{LOCATION_TYPES[v]}</Tag>
                {r.warehouseLocation && <Tag color="blue">{r.warehouseLocation}</Tag>}
              </Space>
            ),
          },
          {
            title: '备货进度',
            render: (_, r) => (
              <Space size={4}>
                <Tag color={r.cleaningDone ? 'green' : 'default'}>清洁</Tag>
                <Tag color={r.repaintingDone ? 'green' : 'default'}>补漆</Tag>
                <Tag color={r.photographyDone ? 'green' : 'default'}>拍照</Tag>
              </Space>
            ),
          },
          {
            title: '上架价',
            dataIndex: 'listPrice',
            render: (v) => (v ? <Money value={v} /> : '-'),
          },
          {
            title: '翻新投入',
            dataIndex: 'actualRefurbishmentCost',
            render: (v) => <Money value={v} />,
          },
          { title: '状态', dataIndex: 'status', render: (v) => <StatusTag map={ITEM_STATUS} value={v} /> },
          { title: '入仓时间', dataIndex: 'storageStartAt', render: fmtTime },
        ]}
      />
    </Card>
  );
}
