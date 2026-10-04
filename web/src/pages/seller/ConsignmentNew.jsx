import { useState } from 'react';
import {
  Card, Form, Input, InputNumber, Select, Switch, Button, message, Upload, Alert,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api, uploadFiles } from '../../api';
import { CATEGORIES } from '../../constants';

export default function ConsignmentNew() {
  const [form] = Form.useForm();
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [strictWarning, setStrictWarning] = useState(null);
  const navigate = useNavigate();

  const submit = async (values) => {
    setSubmitting(true);
    try {
      let defectPhotos = [];
      if (photos.length > 0) {
        defectPhotos = await uploadFiles(photos);
      }
      const res = await api.post('/consignments', { ...values, defectPhotos });
      if (res.requiresStrictVerification) {
        message.warning('已提交。因您的历史记录，本次寄卖将安排严格上门验真。');
      } else {
        message.success('寄卖申请已提交，估价师将尽快与您预约上门');
      }
      navigate('/seller');
    } catch (e) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="提交寄卖申请" style={{ maxWidth: 860 }}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="请如实填写家具信息与瑕疵，平台估价师将上门核验结构、污渍、异味、虫蛀、板材变形与搬运难度后给出寄卖价。"
      />
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={{
          category: 'sofa', disassemblable: false, hasElevator: true,
          acceptsRefurbishment: true, yearsUsed: 1, floor: 1,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Form.Item name="category" label="家具品类" rules={[{ required: true }]}>
            <Select options={CATEGORIES} />
          </Form.Item>
          <Form.Item name="brand" label="品牌" rules={[{ required: true, message: '请填写品牌' }]}>
            <Input placeholder="如：顾家家居" />
          </Form.Item>
          <Form.Item name="material" label="材质" rules={[{ required: true, message: '请填写材质' }]}>
            <Input placeholder="如：布艺+实木框架" />
          </Form.Item>
          <Form.Item name="lengthCm" label="长 (cm)" rules={[{ required: true, message: '必填' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="widthCm" label="宽 (cm)" rules={[{ required: true, message: '必填' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="heightCm" label="高 (cm)" rules={[{ required: true, message: '必填' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="yearsUsed" label="使用年限" rules={[{ required: true }]}>
            <InputNumber min={0} max={50} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="floor" label="所在楼层" rules={[{ required: true }]}>
            <InputNumber min={-3} max={99} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="expectedPrice" label="期望售价 (元)" rules={[{ required: true, message: '必填' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="disassemblable" label="是否可拆装" valuePropName="checked">
            <Switch checkedChildren="可拆装" unCheckedChildren="不可拆" />
          </Form.Item>
          <Form.Item name="hasElevator" label="电梯条件" valuePropName="checked">
            <Switch checkedChildren="有电梯" unCheckedChildren="无电梯" />
          </Form.Item>
          <Form.Item name="acceptsRefurbishment" label="是否接受翻新" valuePropName="checked">
            <Switch checkedChildren="接受" unCheckedChildren="不接受" />
          </Form.Item>
        </div>
        <Form.Item name="defectDescription" label="瑕疵描述">
          <Input.TextArea rows={2} placeholder="请描述划痕、磨损、污渍等瑕疵情况" />
        </Form.Item>
        <Form.Item label="瑕疵照片（最多 6 张）">
          <Upload
            listType="picture-card"
            fileList={photos}
            beforeUpload={() => false}
            onChange={({ fileList }) => setPhotos(fileList.slice(0, 6))}
            multiple
          >
            {photos.length < 6 && (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 4 }}>上传</div>
              </div>
            )}
          </Upload>
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <Form.Item name="address" label="家具所在地址" rules={[{ required: true, message: '请填写地址' }]}>
            <Input placeholder="小区/楼栋/单元" />
          </Form.Item>
          <Form.Item name="contactPhone" label="联系电话" rules={[{ required: true, message: '请填写电话' }]}>
            <Input placeholder="手机" />
          </Form.Item>
        </div>
        <Button type="primary" htmlType="submit" loading={submitting} size="large">
          提交寄卖申请
        </Button>
      </Form>
    </Card>
  );
}
