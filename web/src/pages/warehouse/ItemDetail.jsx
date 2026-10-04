import { useEffect, useState } from 'react';
import {
  Card, Descriptions, Tag, Space, Button, Table, Modal, Form, Input, InputNumber,
  Select, Upload, message, Alert,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { api, uploadFiles, getUser } from '../../api';
import {
  ITEM_STATUS, PREP_TASK_TYPES, PREP_TASK_STATUS, categoryLabel, LOCATION_TYPES, DELIVERY_ZONES,
} from '../../constants';
import { StatusTag, Photos, Money, fmtTime } from '../../components/common';

export default function WarehouseItemDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [completeFor, setCompleteFor] = useState(null);
  const [listOpen, setListOpen] = useState(false);
  const [mismatchOpen, setMismatchOpen] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [completeForm] = Form.useForm();
  const [listForm] = Form.useForm();
  const [mismatchForm] = Form.useForm();
  const user = getUser();

  const load = () => api.get(`/inventory/items/${id}`).then(setData);
  useEffect(() => {
    load();
  }, [id]);

  if (!data) return <Card loading />;
  const c = data.consignment || {};
  const a = data.appraisal || {};

  const completeTask = async (values) => {
    try {
      await api.post(`/inventory/prep-tasks/${completeFor.id}/complete`, values);
      message.success('任务已完成');
      setCompleteFor(null);
      completeForm.resetFields();
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  const listItem = async (values) => {
    try {
      let photoUrls = [];
      if (photos.length > 0) photoUrls = await uploadFiles(photos);
      await api.post(`/inventory/items/${id}/list`, { ...values, photos: photoUrls });
      message.success('已上架');
      setListOpen(false);
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  const reportMismatch = async (values) => {
    try {
      await api.post(`/inventory/items/${id}/report-mismatch`, values);
      message.success('已上报客服处理');
      setMismatchOpen(false);
    } catch (e) {
      message.error(e.message);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title={`家具档案 ${data.itemNo}`}
        extra={
          <Space>
            <StatusTag map={ITEM_STATUS} value={data.status} />
            {['preparing', 'off_shelf'].includes(data.status) && (
              <Button type="primary" onClick={() => setListOpen(true)}>
                {data.status === 'off_shelf' ? '重新上架' : '上架'}
              </Button>
            )}
            {data.status === 'listed' && (
              <Button
                onClick={() =>
                  api.post(`/inventory/items/${id}/off-shelf`).then(() => { message.success('已下架'); load(); })
                }
              >
                下架
              </Button>
            )}
            <Button danger onClick={() => setMismatchOpen(true)}>
              上报实物不符
            </Button>
          </Space>
        }
      >
        <Descriptions bordered size="small" column={3}>
          <Descriptions.Item label="品类">{categoryLabel(c.category)}</Descriptions.Item>
          <Descriptions.Item label="品牌">{c.brand}</Descriptions.Item>
          <Descriptions.Item label="材质">{c.material}</Descriptions.Item>
          <Descriptions.Item label="尺寸">{`${c.lengthCm}×${c.widthCm}×${c.heightCm} cm`}</Descriptions.Item>
          <Descriptions.Item label="存放">
            {LOCATION_TYPES[data.locationType]} {data.warehouseLocation && `· 库位 ${data.warehouseLocation}`}
          </Descriptions.Item>
          <Descriptions.Item label="入仓时间">{fmtTime(data.storageStartAt)}</Descriptions.Item>
          <Descriptions.Item label="寄卖价 / 最低成交价">
            {a.consignmentPrice ? `¥${a.consignmentPrice} / ¥${a.minPrice}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="预估翻新成本">
            <Money value={a.estimatedRefurbishmentCost} />
          </Descriptions.Item>
          <Descriptions.Item label="实际翻新投入">
            <span style={{ color: Number(data.actualRefurbishmentCost) > Number(a.estimatedRefurbishmentCost || 0) * 1.2 && Number(a.estimatedRefurbishmentCost) > 0 ? '#cf1322' : undefined }}>
              <Money value={data.actualRefurbishmentCost} />
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="翻新建议" span={3}>{a.refurbishmentSuggestion || '无'}</Descriptions.Item>
          <Descriptions.Item label="瑕疵照片" span={3}>
            <Photos urls={c.defectPhotos} size={80} />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="备货任务（清洁 / 补漆翻新 / 拍照）">
        <Table
          rowKey="id"
          dataSource={data.prepTasks}
          pagination={false}
          columns={[
            { title: '任务', dataIndex: 'type', render: (v) => PREP_TASK_TYPES[v] },
            { title: '状态', dataIndex: 'status', render: (v) => <StatusTag map={PREP_TASK_STATUS} value={v} /> },
            { title: '实际成本', dataIndex: 'cost', render: (v) => <Money value={v} /> },
            { title: '备注', dataIndex: 'notes' },
            { title: '创建时间', dataIndex: 'createdAt', render: fmtTime },
            {
              title: '操作',
              render: (_, r) =>
                r.status !== 'done' && (
                  <Button size="small" type="primary" onClick={() => setCompleteFor(r)}>
                    完成任务
                  </Button>
                ),
            },
          ]}
        />
      </Card>

      {data.listingTitle && (
        <Card title="上架信息">
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="标题" span={2}>{data.listingTitle}</Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>{data.listingDescription}</Descriptions.Item>
            <Descriptions.Item label="上架价"><Money value={data.listPrice} /></Descriptions.Item>
            <Descriptions.Item label="可配送范围">{(data.deliveryZones || []).join('、') || '-'}</Descriptions.Item>
            <Descriptions.Item label="商品照片" span={2}>
              <Photos urls={data.photos} />
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Modal
        title={`完成【${PREP_TASK_TYPES[completeFor?.type]}】任务`}
        open={!!completeFor}
        onCancel={() => setCompleteFor(null)}
        onOk={() => completeForm.submit()}
      >
        <Form form={completeForm} layout="vertical" onFinish={completeTask} initialValues={{ cost: 0 }}>
          <Form.Item name="cost" label="实际成本 (元)" rules={[{ required: true, message: '请填写成本' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="工艺说明、用料等" />
          </Form.Item>
          {completeFor?.type === 'repainting' && Number(a.estimatedRefurbishmentCost) > 0 && (
            <Alert
              type="info"
              showIcon
              message={`预估翻新成本 ${a.estimatedRefurbishmentCost} 元，实际超出 120% 将自动生成超支预警工单`}
            />
          )}
        </Form>
      </Modal>

      <Modal
        title="上架商品"
        open={listOpen}
        onCancel={() => setListOpen(false)}
        onOk={() => listForm.submit()}
        width={640}
      >
        <Form
          form={listForm}
          layout="vertical"
          onFinish={listItem}
          initialValues={{
            listingTitle: `${c.brand || ''}${categoryLabel(c.category)} 二手闲置`,
            listPrice: a.consignmentPrice ? Number(a.consignmentPrice) : undefined,
            deliveryZones: ['朝阳区'],
          }}
        >
          <Form.Item name="listingTitle" label="上架标题" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="listingDescription" label="上架描述" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={3} placeholder="成色、瑕疵、清洁翻新情况、交付方式" />
          </Form.Item>
          <Form.Item
            name="listPrice"
            label={`上架价（不得低于最低成交价 ¥${a.minPrice ?? '-'}）`}
            rules={[{ required: true, message: '必填' }]}
          >
            <InputNumber min={1} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="deliveryZones" label="可配送范围" rules={[{ required: true, message: '请选择' }]}>
            <Select mode="multiple" options={DELIVERY_ZONES.map((z) => ({ value: z, label: z }))} />
          </Form.Item>
          <Form.Item label="商品照片（最多 8 张）">
            <Upload
              listType="picture-card"
              fileList={photos}
              beforeUpload={() => false}
              onChange={({ fileList }) => setPhotos(fileList.slice(0, 8))}
              multiple
            >
              {photos.length < 8 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 4 }}>上传</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="上报估价与实物不符"
        open={mismatchOpen}
        onCancel={() => setMismatchOpen(false)}
        onOk={() => mismatchForm.submit()}
      >
        <Form form={mismatchForm} layout="vertical" onFinish={reportMismatch}>
          <Form.Item name="description" label="不符情况说明" rules={[{ required: true, message: '请填写说明' }]}>
            <Input.TextArea rows={3} placeholder="如：入库复检发现皮面大面积开裂，与估价记录不符" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
