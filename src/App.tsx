import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import SalesPipeline from './pages/SalesPipeline';
import LeadEngine from './pages/LeadEngine';
import ScraperTenders from './pages/ScraperTenders';
import InquiryDetail from './pages/InquiryDetail';
import ContextualSearch from './pages/ContextualSearch';
import MisHome from './pages/mis/MisHome';
import MisComingSoon from './pages/mis/MisComingSoon';
import TenderPipelineDashboard from './pages/mis/TenderPipelineDashboard';
import BidIntelligenceDashboard from './pages/mis/BidIntelligenceDashboard';
import EstimationDashboard from './pages/mis/EstimationDashboard';
import BidPreparationDashboard from './pages/mis/BidPreparationDashboard';
import TenderResultsDashboard from './pages/mis/TenderResultsDashboard';
import ProjectSetupDashboard from './pages/mis/ProjectSetupDashboard';
import EngineeringDashboard from './pages/mis/EngineeringDashboard';
import ProcurementDashboard from './pages/mis/ProcurementDashboard';
import VendorIntelligenceDashboard from './pages/mis/VendorIntelligenceDashboard';
import InventoryDashboard from './pages/mis/InventoryDashboard';
import QualityDashboard from './pages/mis/QualityDashboard';
import FinanceDashboard from './pages/mis/FinanceDashboard';
import ProjectHealthDashboard from './pages/mis/ProjectHealthDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/mis" replace />} />
          <Route path="/sales-pipeline" element={<SalesPipeline />} />
          <Route path="/tender-intel" element={<LeadEngine />} />
          <Route path="/tender-intel/scraper/:scraperId" element={<ScraperTenders />} />
          <Route path="/search" element={<ContextualSearch />} />
          <Route path="/mis" element={<MisHome />} />
          <Route path="/mis/tender-pipeline" element={<TenderPipelineDashboard />} />
          <Route path="/mis/bid-intelligence" element={<BidIntelligenceDashboard />} />
          <Route path="/mis/estimation" element={<EstimationDashboard />} />
          <Route path="/mis/bid-preparation" element={<BidPreparationDashboard />} />
          <Route path="/mis/tender-results" element={<TenderResultsDashboard />} />
          <Route path="/mis/project-setup" element={<ProjectSetupDashboard />} />
          <Route path="/mis/engineering" element={<EngineeringDashboard />} />
          <Route path="/mis/procurement" element={<ProcurementDashboard />} />
          <Route path="/mis/vendor-intelligence" element={<VendorIntelligenceDashboard />} />
          <Route path="/mis/inventory-material" element={<InventoryDashboard />} />
          <Route path="/mis/quality" element={<QualityDashboard />} />
          <Route path="/mis/finance" element={<FinanceDashboard />} />
          <Route path="/mis/project-health" element={<ProjectHealthDashboard />} />
          <Route path="/mis/:id" element={<MisComingSoon />} />
        </Route>
        <Route path="/inquiry/:id" element={<InquiryDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
