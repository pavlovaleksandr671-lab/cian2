import { Routes, Route } from 'react-router-dom';
import { UIKitPage } from './pages/UIKitPage';
import { AuctionPage } from './pages/AuctionPage';
export default function App() {
  return (
    <Routes>
      <Route path="/auction" element={<AuctionPage />} />
      <Route path="*" element={<UIKitPage />} />
    </Routes>
  );
}
