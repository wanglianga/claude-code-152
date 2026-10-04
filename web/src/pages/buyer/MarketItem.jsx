import { useEffect, useState } from 'react';
import {
  Card, Descriptions, Tag, Space, Button, Modal, Form, Input, InputNumber,
  Select, Switch, DatePicker, message, Alert,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { api, getUser } from '../../api';
import { categoryLabel, conditionLabel, LOCATION_TYPES, VEHICLE_TYPES, vehicleLabel } from '../../constants';
import { Photos, Money } from '../../components/common';

export default function MarketItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const user = getUser();

  useEffect(() => {
    api.get(`/marketplace/${id}`).then(setData);
  }, [id]);

  if (!data) return <Card loading />;
  const c = data.consignment || {};
  const a = data.appraisal || {};

  const feeWatch = Form.useWatch([], form);
  const estimateFee = () => {
    const v = form.getFieldsValue();
    let fee = { small_van: 80, medium_truck: 150, large_truck: 260 }[v.vehicleType || 'small_van'];
    if (!v.hasElevator && (v.floor || 1) > 1) fee += (v.floor - 1) * 10;
    if (v.needDisassembly) fee += 60;
    if (v.needOldFurnitureRemoval) fee += 50;
    return fee;
  };

  const submitOrder = async (values) => {
    setSubmitting(true);
    try {
      await api.post('/orders', {
        ...values,
        itemId: Number(id),
        appointmentAt: values.appointmentAt?.toISOString(),
      });
      message.success('下单成功，平台将安排配送');
      setOrderOpen(false);
      navigate('/buyer/orders');
    } catch (e) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16 }}>
      <Card title={data.listingTitle}>
        <Photos urls={data.photos} size={300} />
        <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
          <Descriptions.Item label="品类">{categoryLabel(c.category)}</Descriptions.Item>
          <Descriptions.Item label="品牌">{c.brand}</Descriptions.Item>
          <Descriptions.Item label="材质">{c.material}</Descriptions.Item>
          <Descriptions.Item label="尺寸">{`${c.lengthCm}×${c.widthCm}×${c.heightCm} cm`}</Descriptions.Item>
          <Descriptions.Item label="使用年限">{c.yearsUsed} 年</Descriptions.Item>
          <Descriptions.Item label="存放">{LOCATION_TYPES[data.locationType]}</Descriptions.Item>
          <Descriptions.Item label="可拆装">{c.disassemblable ? '是' : '否'}</Descriptions.Item>
          <Descriptions.Item label="配送范围">{(data.deliveryZones || []).join('、')}</Descriptions.Item>
          <Descriptions.Item label="已完成的整备" span={2}>
            <Space size={4}>
              <Tag color={data.cleaningDone ? 'green' : 'default'}>深度清洁</Tag>
              <Tag color={data.repaintingDone ? 'green' : 'default'}>补漆翻新</Tag>
              <Tag color={data.photographyDone ? 'green' : 'default'}>实物拍照</Tag>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="商品描述" span={2}>{data.listingDescription}</Descriptions.Item>
          <Descriptions.Item label="瑕疵说明" span={2}>{c.defectDescription || '无'}</Descriptions.Item>
          {c.defectPhotos?.length > 0 && (
            <Descriptions.Item label="瑕疵照片" span={2}>
              <Photos urls={c.defectPhotos} size={80} />
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="质检与价格">
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="结构">{conditionLabel(a.structureCondition)}</Descriptions.Item>
          <Descriptions.Item label="污渍">{conditionLabel(a.stainLevel)}</Descriptions.Item>
          <Descriptions.Item label="异味">{conditionLabel(a.odorLevel)}</Descriptions.Item>
          <Descriptions.Item label="虫蛀/板材变形">
            {a.insectDamage ? '有虫蛀' : '无虫蛀'} / {a.boardDeformation ? '有变形' : '无变形'}
          </Descriptions.Item>
        </Descriptions>
        <div style={{ margin: '24px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 32, color: '#b03a2e', fontWeight: 700 }}>
            <Money value={data.listPrice} />
          </div>
          <div style={{ color: '#999', fontSize: 12 }}>平台质检 · 佣金透明 · 售后有保障</div>
        </div>
        {user?.role === 'buyer' ? (
          <Button type="primary" size="large" block onClick={() => setOrderOpen(true)}>
            立即下单
          </Button>
        ) : (
          <Alert type="info" showIcon message="请使用买家账号登录后下单" />
        )}
      </Card>

      <Modal
        title="确认订单"
        open={orderOpen}
        onCancel={() => setOrderOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={submitOrder}
          initialValues={{
            floor: 1, hasElevator: true, needDisassembly: false,
            needOldFurnitureRemoval: false, vehicleType: 'medium_truck',
            appointmentAt: dayjs().add(1, 'day'),
          }}
        >
          <Form.Item name="address" label="收货地址" rules={[{ required: true, message: '请填写地址' }]}>
            <Input placeholder="小区/楼栋/门牌号" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="floor" label="楼层" rules={[{ required: true }]}>
              <InputNumber min={-3} max={99} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="hasElevator" label="电梯" valuePropName="checked">
              <Switch checkedChildren="有" unCheckedChildren="无" />
            </Form.Item>
            <Form.Item name="vehicleType" label="车型" rules={[{ required: true }]}>
              <Select options={VEHICLE_TYPES} />
            </Form.Item>
            <Form.Item name="needDisassembly" label="拆装服务" valuePropName="checked">
              <Switch checkedChildren="需要" unCheckedChildren="不需要" />
            </Form.Item>
            <Form.Item name="needOldFurnitureRemoval" label="旧家具搬出" valuePropName="checked">
              <Switch checkedChildren="需要" unCheckedChildren="不需要" />
            </Form.Item>
            <Form.Item name="appointmentAt" label="预约配送时间" rules={[{ required: true, message: '请选择' }]}>
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Alert
            type="info"
            showIcon
            message={
              <div>
                商品价格 <Money value={data.listPrice} /> + 预估配送费 <Money value={estimateFee()} />
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                  配送费 = 车型基价 + 无电梯楼层费(10元/层) + 拆装60元 + 旧家具搬出50元
                </div>
              </div>
            }
          />
        </Form>
      </Modal>
    </div>
  );
}
