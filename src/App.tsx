import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import SalesPipeline from './pages/SalesPipeline';
import LeadEngine from './pages/LeadEngine';
import InquiryDetail from './pages/InquiryDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/tender-intel" replace />} />
          <Route path="/sales-pipeline" element={<SalesPipeline />} />
          <Route path="/tender-intel" element={<LeadEngine />} />
        </Route>
        <Route path="/inquiry/:id" element={<InquiryDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
