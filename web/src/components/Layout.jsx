import { Layout, Menu, Dropdown, Tag } from 'antd';
import {
  HomeOutlined, PlusCircleOutlined, ScheduleOutlined, InboxOutlined,
  ShopOutlined, ProfileOutlined, CarOutlined, CustomerServiceOutlined,
  BarChartOutlined, TeamOutlined, AccountBookOutlined, LogoutOutlined,
  UserOutlined, WalletOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { getUser, clearSession } from '../api';

const MENUS = {
  seller: [
    { key: '/seller', icon: <HomeOutlined />, label: '我的寄卖' },
    { key: '/seller/new', icon: <PlusCircleOutlined />, label: '提交寄卖' },
    { key: '/seller/settlements', icon: <WalletOutlined />, label: '我的结算' },
  ],
  buyer: [
    { key: '/market', icon: <ShopOutlined />, label: '逛商城' },
    { key: '/buyer/orders', icon: <ProfileOutlined />, label: '我的订单' },
  ],
  appraiser: [
    { key: '/appraiser', icon: <ScheduleOutlined />, label: '估价任务' },
  ],
  warehouse: [
    { key: '/warehouse', icon: <InboxOutlined />, label: '库存与备货' },
  ],
  refurbisher: [
    { key: '/warehouse', icon: <InboxOutlined />, label: '库存与备货' },
  ],
  delivery: [
    { key: '/delivery', icon: <CarOutlined />, label: '配送任务' },
  ],
  customer_service: [
    { key: '/cs', icon: <CustomerServiceOutlined />, label: '异常工单' },
  ],
  operations: [
    { key: '/ops', icon: <BarChartOutlined />, label: '品类分析' },
    { key: '/ops/sellers', icon: <TeamOutlined />, label: '卖家风险' },
    { key: '/ops/settlements', icon: <AccountBookOutlined />, label: '结算管理' },
  ],
  admin: [
    { key: '/ops', icon: <BarChartOutlined />, label: '品类分析' },
    { key: '/ops/sellers', icon: <TeamOutlined />, label: '卖家风险' },
    { key: '/ops/settlements', icon: <AccountBookOutlined />, label: '结算管理' },
    { key: '/cs', icon: <CustomerServiceOutlined />, label: '异常工单' },
  ],
};

export default function AppLayout() {
  const user = getUser();
  const navigate = useNavigate();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace />;

  const menus = MENUS[user.role] || [];
  const selected =
    menus
      .map((m) => m.key)
      .filter((k) => location.pathname.startsWith(k))
      .sort((a, b) => b.length - a.length)[0] || menus[0]?.key;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider theme="dark" width={208}>
        <div
          style={{
            color: '#fff', fontWeight: 700, fontSize: 17, padding: '18px 20px',
            letterSpacing: 1,
          }}
        >
          焕新到家
          <div style={{ fontSize: 11, fontWeight: 400, color: '#ffffff88', marginTop: 2 }}>
            城市二手家具寄卖平台
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selected]}
          items={menus}
          onClick={({ key }) => navigate(key)}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header
          style={{
            background: '#fff', display: 'flex', justifyContent: 'flex-end',
            alignItems: 'center', padding: '0 24px', boxShadow: '0 1px 4px #0001',
            position: 'sticky', top: 0, zIndex: 10,
          }}
        >
          <Dropdown
            menu={{
              items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }],
              onClick: () => {
                clearSession();
                navigate('/login');
              },
            }}
          >
            <span style={{ cursor: 'pointer' }}>
              <UserOutlined style={{ marginRight: 6 }} />
              {user.name}
              <Tag color="red" style={{ marginLeft: 8 }}>{user.roleLabel}</Tag>
            </span>
          </Dropdown>
        </Layout.Header>
        <Layout.Content style={{ padding: 24, background: '#f5f5f5' }}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
