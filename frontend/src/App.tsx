import { Navigate, Route, Routes } from "react-router-dom";
import { CertificateListScreen } from "./features/certificate/CertificateListScreen";
import { IssueScreen } from "./features/certificate/IssueScreen";
import { VerifyScreen } from "./features/certificate/VerifyScreen";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/certificates" replace />} />
      <Route path="/certificates" element={<CertificateListScreen />} />
      <Route path="/certificates/:tokenId" element={<CertificateListScreen />} />
      <Route path="/verify" element={<VerifyScreen />} />
      <Route path="/issue" element={<IssueScreen />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
