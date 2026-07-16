import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import SalesPipeline from './pages/SalesPipeline';
import LeadEngine from './pages/LeadEngine';
import ScraperTenders from './pages/ScraperTenders';
import InquiryDetail from './pages/InquiryDetail';
import ContextualSearch from './pages/ContextualSearch';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/tender-intel" replace />} />
          <Route path="/sales-pipeline" element={<SalesPipeline />} />
          <Route path="/tender-intel" element={<LeadEngine />} />
          <Route path="/tender-intel/scraper/:scraperId" element={<ScraperTenders />} />
          <Route path="/search" element={<ContextualSearch />} />
        </Route>
        <Route path="/inquiry/:id" element={<InquiryDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
