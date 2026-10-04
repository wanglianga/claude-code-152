// 与后端枚举一致的中文展示常量
export const CATEGORIES = [
  { value: 'sofa', label: '沙发' },
  { value: 'dining_table', label: '餐桌' },
  { value: 'kids_bed', label: '儿童床' },
  { value: 'bookshelf', label: '书柜' },
  { value: 'office_chair', label: '办公椅' },
  { value: 'appliance_cabinet', label: '家电柜' },
];
export const categoryLabel = (v) =>
  CATEGORIES.find((c) => c.value === v)?.label || v;

export const CONSIGNMENT_STATUS = {
  pending_appraisal: { label: '待估价', color: 'gold' },
  scheduled: { label: '已预约上门', color: 'blue' },
  appraised: { label: '待确认估价', color: 'orange' },
  accepted: { label: '备货中', color: 'cyan' },
  rejected_by_seller: { label: '未接受估价', color: 'default' },
  cancelled: { label: '已取消', color: 'default' },
  completed: { label: '已完结', color: 'green' },
};

export const ITEM_STATUS = {
  preparing: { label: '备货中', color: 'cyan' },
  listed: { label: '在售', color: 'green' },
  reserved: { label: '已锁定', color: 'orange' },
  sold: { label: '已售出', color: 'blue' },
  completed: { label: '已完结', color: 'default' },
  off_shelf: { label: '已下架', color: 'default' },
  returned_to_seller: { label: '已退回卖家', color: 'default' },
};

export const ORDER_STATUS = {
  paid: { label: '已支付·待调度', color: 'gold' },
  scheduled: { label: '已预约配送', color: 'blue' },
  delivering: { label: '配送中', color: 'processing' },
  delivered: { label: '已送达·待确认', color: 'orange' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'default' },
  refunded: { label: '已退货退款', color: 'red' },
};

export const DELIVERY_STATUS = {
  scheduled: { label: '待执行', color: 'blue' },
  en_route: { label: '配送中', color: 'processing' },
  delivered: { label: '已送达', color: 'green' },
  failed: { label: '配送失败', color: 'red' },
};

export const ISSUE_TYPES = {
  seller_regret: '卖家临时反悔',
  appraisal_mismatch: '估价与实物不符',
  refurbishment_overrun: '翻新成本超预期',
  color_difference: '色差争议',
  elevator_unfit: '无法进电梯',
  delivery_damage: '配送磕碰',
  return_request: '售后退货',
  other: '其他',
};

export const ISSUE_STATUS = {
  open: { label: '待处理', color: 'red' },
  processing: { label: '处理中', color: 'orange' },
  resolved: { label: '已解决', color: 'green' },
  closed: { label: '已关闭', color: 'default' },
};

export const PREP_TASK_TYPES = {
  cleaning: '清洁',
  repainting: '补漆翻新',
  photography: '拍照',
};

export const PREP_TASK_STATUS = {
  pending: { label: '待处理', color: 'gold' },
  in_progress: { label: '进行中', color: 'processing' },
  done: { label: '已完成', color: 'green' },
};

export const SETTLEMENT_STATUS = {
  pending: { label: '待结算', color: 'gold' },
  finalized: { label: '已结算', color: 'green' },
};

export const SETTLEMENT_LINE_TYPES = {
  transaction_price: '成交价',
  commission: '平台佣金',
  refurbishment: '翻新费',
  storage: '仓储费',
  delivery: '配送费',
  aftersales_compensation: '售后赔付',
  adjustment: '调整项',
};

export const VEHICLE_TYPES = [
  { value: 'small_van', label: '小型面包车(¥80)' },
  { value: 'medium_truck', label: '中型货车(¥150)' },
  { value: 'large_truck', label: '大型货车(¥260)' },
];
export const vehicleLabel = (v) =>
  ({ small_van: '小型面包车', medium_truck: '中型货车', large_truck: '大型货车' }[v] || v);

export const CONDITION_LEVELS = [
  { value: 'good', label: '良好' },
  { value: 'fair', label: '一般' },
  { value: 'poor', label: '较差' },
];
export const conditionLabel = (v) =>
  ({ good: '良好', fair: '一般', poor: '较差' }[v] || v);

export const MOVING_DIFFICULTY = [
  { value: 'easy', label: '容易' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
];

export const LOCATION_TYPES = {
  warehouse: '平台仓库',
  seller_home: '卖家家中',
};

export const ROLE_HOME = {
  seller: '/seller',
  buyer: '/market',
  appraiser: '/appraiser',
  warehouse: '/warehouse',
  refurbisher: '/warehouse',
  delivery: '/delivery',
  customer_service: '/cs',
  operations: '/ops',
  admin: '/ops',
};

export const DELIVERY_ZONES = [
  '朝阳区', '海淀区', '东城区', '西城区', '丰台区', '石景山区', '通州区', '大兴区',
];
