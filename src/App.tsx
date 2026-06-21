import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SalesPipeline from './pages/SalesPipeline';
import InquiryDetail from './pages/InquiryDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SalesPipeline />} />
        <Route path="/inquiry/:id" element={<InquiryDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
