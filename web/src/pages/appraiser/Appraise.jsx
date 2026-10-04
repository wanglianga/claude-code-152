import { useEffect, useState } from 'react';
import {
  Card, Form, Select, Switch, InputNumber, Input, Button, message, Descriptions, Alert, Checkbox,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { categoryLabel, CONDITION_LEVELS, MOVING_DIFFICULTY } from '../../constants';
import { Photos, Money } from '../../components/common';

export default function Appraise() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/consignments/${id}`).then(setData);
  }, [id]);

  if (!data) return <Card loading />;

  const submit = async (values) => {
    setSubmitting(true);
    try {
      await api.post('/appraisals', { ...values, consignmentId: Number(id) });
      message.success('估价单已提交，等待卖家确认');
      navigate('/appraiser');
    } catch (e) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }}>
      <Card title="寄卖申请信息">
        {data.requiresStrictVerification && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="该卖家触发严格验真"
            description={data.strictVerificationReason}
          />
        )}
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="品类">{categoryLabel(data.category)}</Descriptions.Item>
          <Descriptions.Item label="品牌/材质">{data.brand} / {data.material}</Descriptions.Item>
          <Descriptions.Item label="尺寸">
            {`${data.lengthCm}×${data.widthCm}×${data.heightCm} cm`}
          </Descriptions.Item>
          <Descriptions.Item label="使用年限">{data.yearsUsed} 年</Descriptions.Item>
          <Descriptions.Item label="期望售价"><Money value={data.expectedPrice} /></Descriptions.Item>
          <Descriptions.Item label="楼层/电梯">
            {data.floor} 层 / {data.hasElevator ? '有电梯' : '无电梯'} / {data.disassemblable ? '可拆装' : '不可拆装'}
          </Descriptions.Item>
          <Descriptions.Item label="卖家自述瑕疵">{data.defectDescription || '无'}</Descriptions.Item>
          <Descriptions.Item label="瑕疵照片">
            <Photos urls={data.defectPhotos} size={80} />
          </Descriptions.Item>
          <Descriptions.Item label="地址">{data.address}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="上门检查与估价">
        <Form
          form={form}
          layout="vertical"
          onFinish={submit}
          initialValues={{
            structureCondition: 'good', stainLevel: 'fair', odorLevel: 'good',
            insectDamage: false, boardDeformation: false, movingDifficulty: 'medium',
            commissionRate: 0.15, estimatedRefurbishmentCost: 0, strictCheckPerformed: false,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="structureCondition" label="结构" rules={[{ required: true }]}>
              <Select options={CONDITION_LEVELS} />
            </Form.Item>
            <Form.Item name="stainLevel" label="污渍" rules={[{ required: true }]}>
              <Select options={CONDITION_LEVELS} />
            </Form.Item>
            <Form.Item name="odorLevel" label="异味" rules={[{ required: true }]}>
              <Select options={CONDITION_LEVELS} />
            </Form.Item>
            <Form.Item name="insectDamage" label="虫蛀" valuePropName="checked">
              <Switch checkedChildren="有" unCheckedChildren="无" />
            </Form.Item>
            <Form.Item name="boardDeformation" label="板材变形" valuePropName="checked">
              <Switch checkedChildren="有" unCheckedChildren="无" />
            </Form.Item>
            <Form.Item name="movingDifficulty" label="搬运难度" rules={[{ required: true }]}>
              <Select options={MOVING_DIFFICULTY} />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="consignmentPrice" label="寄卖价 (元)" rules={[{ required: true, message: '必填' }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="minPrice" label="最低成交价 (元)" rules={[{ required: true, message: '必填' }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="commissionRate" label="平台佣金比例" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 0.1, label: '10%' },
                  { value: 0.12, label: '12%' },
                  { value: 0.15, label: '15%' },
                  { value: 0.18, label: '18%' },
                  { value: 0.2, label: '20%' },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="refurbishmentSuggestion" label="清洁翻新建议">
            <Input.TextArea rows={2} placeholder="如：深度清洁、扶手补色、更换合页" />
          </Form.Item>
          <Form.Item name="estimatedRefurbishmentCost" label="预估翻新成本 (元)">
            <InputNumber min={0} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
          {data.requiresStrictVerification && (
            <Form.Item
              name="strictCheckPerformed"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, v) =>
                    v ? Promise.resolve() : Promise.reject(new Error('严格验真必须逐项核验后勾选')),
                },
              ]}
            >
              <Checkbox>已完成严格验真（逐项核验结构/污渍/异味/虫蛀/变形与描述一致性）</Checkbox>
            </Form.Item>
          )}
          <Button type="primary" htmlType="submit" loading={submitting} size="large">
            提交估价单
          </Button>
        </Form>
      </Card>
    </div>
  );
}
