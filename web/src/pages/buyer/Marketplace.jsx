import { useEffect, useState } from 'react';
import { Card, Row, Col, Select, Input, Tag, Empty, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { CATEGORIES, categoryLabel, LOCATION_TYPES } from '../../constants';
import { Money, Photos } from '../../components/common';

export default function Marketplace() {
  const [list, setList] = useState([]);
  const [category, setCategory] = useState();
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();

  const load = () => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (keyword) params.set('keyword', keyword);
    api.get(`/marketplace?${params}`).then(setList);
  };
  useEffect(() => {
    load();
  }, [category]);

  return (
    <Card
      title="家具商城"
      extra={
        <Space>
          <Select
            allowClear
            placeholder="品类"
            style={{ width: 130 }}
            options={CATEGORIES}
            value={category}
            onChange={setCategory}
          />
          <Input.Search
            placeholder="搜索品牌/材质"
            style={{ width: 220 }}
            onSearch={(v) => {
              setKeyword(v);
              const params = new URLSearchParams();
              if (category) params.set('category', category);
              if (v) params.set('keyword', v);
              api.get(`/marketplace?${params}`).then(setList);
            }}
          />
        </Space>
      }
    >
      {list.length === 0 && <Empty description="暂无在售家具" />}
      <Row gutter={[16, 16]}>
        {list.map((item) => (
          <Col key={item.id} xs={24} sm={12} md={8} lg={6}>
            <Card
              hoverable
              onClick={() => navigate(`/market/${item.id}`)}
              cover={
                <div style={{ padding: 12, paddingBottom: 0 }}>
                  <Photos urls={item.photos} size={220} />
                </div>
              }
            >
              <Card.Meta
                title={item.listingTitle}
                description={
                  <div>
                    <Space size={4} wrap>
                      <Tag>{categoryLabel(item.consignment?.category)}</Tag>
                      <Tag>{LOCATION_TYPES[item.locationType]}</Tag>
                      {item.consignment?.disassemblable && <Tag color="blue">可拆装</Tag>}
                    </Space>
                    <div style={{ marginTop: 8, color: '#b03a2e', fontSize: 18, fontWeight: 700 }}>
                      <Money value={item.listPrice} />
                    </div>
                    <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                      配送范围：{(item.deliveryZones || []).join('、') || '面议'}
                    </div>
                  </div>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
}
