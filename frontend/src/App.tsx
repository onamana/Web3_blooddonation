import { Navigate, Route, Routes } from "react-router-dom";
import { CertificateDetailScreen } from "./features/certificate/CertificateDetailScreen";
import { CertificateListScreen } from "./features/certificate/CertificateListScreen";
import { VerifyScreen } from "./features/certificate/VerifyScreen";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/certificates" replace />} />
      <Route path="/certificates" element={<CertificateListScreen />} />
      <Route path="/certificates/:tokenId" element={<CertificateDetailScreen />} />
      <Route path="/verify" element={<VerifyScreen />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
