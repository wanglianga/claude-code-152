import { useEffect, useState } from 'react';
import {
  Card, Descriptions, Tag, Button, Space, message, Modal, Input, Radio, Alert, Steps,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import {
  CONSIGNMENT_STATUS, ITEM_STATUS, ORDER_STATUS, categoryLabel, conditionLabel,
} from '../../constants';
import { StatusTag, Photos, Money, fmtTime } from '../../components/common';

const FLOW = [
  { key: 'pending_appraisal', title: '提交申请' },
  { key: 'scheduled', title: '预约上门' },
  { key: 'appraised', title: '平台估价' },
  { key: 'accepted', title: '备货上架' },
  { key: 'completed', title: '成交完结' },
];

export default function ConsignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [regretOpen, setRegretOpen] = useState(false);
  const [locationType, setLocationType] = useState('warehouse');
  const [regretReason, setRegretReason] = useState('');

  const load = () => api.get(`/consignments/${id}`).then(setData);
  useEffect(() => {
    load();
  }, [id]);

  if (!data) return <Card loading />;

  const act = async (fn, successMsg) => {
    try {
      await fn();
      message.success(successMsg);
      setAcceptOpen(false);
      setRegretOpen(false);
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  const flowIndex = Math.max(
    0,
    FLOW.findIndex((f) => f.key === data.status),
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title={`寄卖申请 ${data.applicationNo}`}
        extra={
          <Space>
            <StatusTag map={CONSIGNMENT_STATUS} value={data.status} />
            {data.requiresStrictVerification && <Tag color="volcano">严格验真</Tag>}
          </Space>
        }
      >
        <Steps
          size="small"
          current={data.status === 'completed' ? 5 : flowIndex}
          items={FLOW}
          status={['cancelled', 'rejected_by_seller'].includes(data.status) ? 'error' : 'process'}
          style={{ marginBottom: 24 }}
        />
        {data.requiresStrictVerification && (
          <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={data.strictVerificationReason} />
        )}
        <Descriptions bordered size="small" column={3}>
          <Descriptions.Item label="品类">{categoryLabel(data.category)}</Descriptions.Item>
          <Descriptions.Item label="品牌">{data.brand}</Descriptions.Item>
          <Descriptions.Item label="材质">{data.material}</Descriptions.Item>
          <Descriptions.Item label="尺寸(长×宽×高)">
            {`${data.lengthCm}×${data.widthCm}×${data.heightCm} cm`}
          </Descriptions.Item>
          <Descriptions.Item label="使用年限">{data.yearsUsed} 年</Descriptions.Item>
          <Descriptions.Item label="期望售价"><Money value={data.expectedPrice} /></Descriptions.Item>
          <Descriptions.Item label="可拆装">{data.disassemblable ? '是' : '否'}</Descriptions.Item>
          <Descriptions.Item label="楼层/电梯">
            {data.floor} 层 / {data.hasElevator ? '有电梯' : '无电梯'}
          </Descriptions.Item>
          <Descriptions.Item label="接受翻新">{data.acceptsRefurbishment ? '是' : '否'}</Descriptions.Item>
          <Descriptions.Item label="地址" span={2}>{data.address}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{data.contactPhone}</Descriptions.Item>
          <Descriptions.Item label="预约上门" span={1}>{fmtTime(data.appointmentAt)}</Descriptions.Item>
          <Descriptions.Item label="瑕疵描述" span={2}>
            {data.defectDescription || '无'}
          </Descriptions.Item>
          <Descriptions.Item label="瑕疵照片" span={3}>
            <Photos urls={data.defectPhotos} />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {data.appraisal && (
        <Card title="平台估价单">
          <Descriptions bordered size="small" column={3}>
            <Descriptions.Item label="结构">{conditionLabel(data.appraisal.structureCondition)}</Descriptions.Item>
            <Descriptions.Item label="污渍">{conditionLabel(data.appraisal.stainLevel)}</Descriptions.Item>
            <Descriptions.Item label="异味">{conditionLabel(data.appraisal.odorLevel)}</Descriptions.Item>
            <Descriptions.Item label="虫蛀">{data.appraisal.insectDamage ? '有' : '无'}</Descriptions.Item>
            <Descriptions.Item label="板材变形">{data.appraisal.boardDeformation ? '有' : '无'}</Descriptions.Item>
            <Descriptions.Item label="搬运难度">
              {{ easy: '容易', medium: '中等', hard: '困难' }[data.appraisal.movingDifficulty]}
            </Descriptions.Item>
            <Descriptions.Item label="寄卖价">
              <Money value={data.appraisal.consignmentPrice} />
            </Descriptions.Item>
            <Descriptions.Item label="最低成交价">
              <Money value={data.appraisal.minPrice} />
            </Descriptions.Item>
            <Descriptions.Item label="平台佣金">
              {(Number(data.appraisal.commissionRate) * 100).toFixed(0)}%
            </Descriptions.Item>
            <Descriptions.Item label="翻新建议" span={2}>
              {data.appraisal.refurbishmentSuggestion || '无'}
            </Descriptions.Item>
            <Descriptions.Item label="预估翻新成本">
              <Money value={data.appraisal.estimatedRefurbishmentCost} />
            </Descriptions.Item>
            <Descriptions.Item label="估价师备注" span={3}>
              {data.appraisal.notes || '无'}
              {data.appraisal.strictCheckPerformed && <Tag color="volcano" style={{ marginLeft: 8 }}>已严格验真</Tag>}
            </Descriptions.Item>
          </Descriptions>
          {data.status === 'appraised' && (
            <Space style={{ marginTop: 16 }}>
              <Button type="primary" onClick={() => setAcceptOpen(true)}>
                接受估价，委托寄卖
              </Button>
              <Button
                danger
                onClick={() =>
                  act(() => api.post(`/consignments/${id}/reject`), '已拒绝本次估价')
                }
              >
                不接受估价
              </Button>
            </Space>
          )}
        </Card>
      )}

      {data.item && (
        <Card title="家具档案与上架">
          <Descriptions bordered size="small" column={3}>
            <Descriptions.Item label="库存编号">{data.item.itemNo}</Descriptions.Item>
            <Descriptions.Item label="存放方式">
              {data.item.locationType === 'warehouse' ? '平台仓库' : '卖家家中'}
            </Descriptions.Item>
            <Descriptions.Item label="库位">{data.item.warehouseLocation || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <StatusTag map={ITEM_STATUS} value={data.item.status} />
            </Descriptions.Item>
            <Descriptions.Item label="上架价">
              {data.item.listPrice ? <Money value={data.item.listPrice} /> : '未上架'}
            </Descriptions.Item>
            <Descriptions.Item label="实际翻新投入">
              <Money value={data.item.actualRefurbishmentCost} />
            </Descriptions.Item>
            <Descriptions.Item label="备货进度" span={3}>
              <Space>
                <Tag color={data.item.cleaningDone ? 'green' : 'default'}>清洁</Tag>
                <Tag color={data.item.repaintingDone ? 'green' : 'default'}>补漆翻新</Tag>
                <Tag color={data.item.photographyDone ? 'green' : 'default'}>拍照</Tag>
              </Space>
            </Descriptions.Item>
            {data.item.listingTitle && (
              <Descriptions.Item label="上架标题" span={3}>{data.item.listingTitle}</Descriptions.Item>
            )}
            {data.item.photos?.length > 0 && (
              <Descriptions.Item label="商品照片" span={3}>
                <Photos urls={data.item.photos} />
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {data.order && (
        <Card title="关联订单">
          <Descriptions bordered size="small" column={3}>
            <Descriptions.Item label="订单号">{data.order.orderNo}</Descriptions.Item>
            <Descriptions.Item label="成交价"><Money value={data.order.price} /></Descriptions.Item>
            <Descriptions.Item label="状态">
              <StatusTag map={ORDER_STATUS} value={data.order.status} />
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {!['cancelled', 'completed', 'rejected_by_seller'].includes(data.status) && (
        <Card>
          <Button danger onClick={() => setRegretOpen(true)}>
            我要取消寄卖（反悔）
          </Button>
          <span style={{ marginLeft: 12, color: '#999', fontSize: 12 }}>
            反悔将生成异常工单由客服协同处理，并计入信用记录
          </span>
        </Card>
      )}

      <Modal
        title="接受估价 · 选择存放方式"
        open={acceptOpen}
        onCancel={() => setAcceptOpen(false)}
        onOk={() =>
          act(
            () => api.post(`/consignments/${id}/accept`, { locationType }),
            '已确认寄卖，平台开始备货',
          )
        }
      >
        <Radio.Group value={locationType} onChange={(e) => setLocationType(e.target.value)}>
          <Radio value="warehouse">送入平台仓库（推荐，成交更快，计仓储费 3 元/天）</Radio>
          <Radio value="seller_home">暂放卖家家中（成交后上门取件配送）</Radio>
        </Radio.Group>
      </Modal>

      <Modal
        title="取消寄卖（反悔）"
        open={regretOpen}
        onCancel={() => setRegretOpen(false)}
        onOk={() =>
          act(
            () => api.post(`/consignments/${id}/regret`, { reason: regretReason }),
            '已提交反悔申请，客服将介入处理',
          )
        }
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="若商品已上架或已有订单，取消将影响买家并计入您的信用记录。"
        />
        <Input.TextArea
          rows={3}
          placeholder="请说明反悔原因"
          value={regretReason}
          onChange={(e) => setRegretReason(e.target.value)}
        />
      </Modal>
    </Space>
  );
}
