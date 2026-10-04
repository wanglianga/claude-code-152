import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser } from './api';
import { ROLE_HOME } from './constants';
import AppLayout from './components/Layout';
import Login from './pages/Login';
import SellerConsignments from './pages/seller/Consignments';
import SellerConsignmentNew from './pages/seller/ConsignmentNew';
import SellerConsignmentDetail from './pages/seller/ConsignmentDetail';
import SellerSettlements from './pages/seller/Settlements';
import AppraiserTasks from './pages/appraiser/Tasks';
import AppraiserAppraise from './pages/appraiser/Appraise';
import WarehouseItems from './pages/warehouse/Items';
import WarehouseItemDetail from './pages/warehouse/ItemDetail';
import Marketplace from './pages/buyer/Marketplace';
import MarketItem from './pages/buyer/MarketItem';
import BuyerOrders from './pages/buyer/Orders';
import DeliveryTasks from './pages/delivery/Tasks';
import CsIssues from './pages/cs/Issues';
import CsIssueDetail from './pages/cs/IssueDetail';
import OpsAnalytics from './pages/ops/Analytics';
import OpsSellers from './pages/ops/Sellers';
import OpsSettlements from './pages/ops/Settlements';
import SettlementDetail from './pages/ops/SettlementDetail';

function Home() {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] || '/market'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/seller" element={<SellerConsignments />} />
          <Route path="/seller/new" element={<SellerConsignmentNew />} />
          <Route path="/seller/consignments/:id" element={<SellerConsignmentDetail />} />
          <Route path="/seller/settlements" element={<SellerSettlements />} />
          <Route path="/appraiser" element={<AppraiserTasks />} />
          <Route path="/appraiser/appraise/:id" element={<AppraiserAppraise />} />
          <Route path="/warehouse" element={<WarehouseItems />} />
          <Route path="/warehouse/items/:id" element={<WarehouseItemDetail />} />
          <Route path="/market" element={<Marketplace />} />
          <Route path="/market/:id" element={<MarketItem />} />
          <Route path="/buyer/orders" element={<BuyerOrders />} />
          <Route path="/delivery" element={<DeliveryTasks />} />
          <Route path="/cs" element={<CsIssues />} />
          <Route path="/cs/issues/:id" element={<CsIssueDetail />} />
          <Route path="/ops" element={<OpsAnalytics />} />
          <Route path="/ops/sellers" element={<OpsSellers />} />
          <Route path="/ops/settlements" element={<OpsSettlements />} />
          <Route path="/ops/settlements/:id" element={<SettlementDetail />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
