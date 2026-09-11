import { Navigate, Route, Routes } from "react-router-dom";
import { CertificateDetailScreen } from "./features/certificate/CertificateDetailScreen";
import { CertificateListScreen } from "./features/certificate/CertificateListScreen";
import { IssueScreen } from "./features/certificate/IssueScreen";
import { VerifyScreen } from "./features/certificate/VerifyScreen";
import { NotFoundPage } from "./pages/NotFoundPage";
import { Academy } from "./features/academy/Academy";
import { CredentialsScreen } from './features/credentials/CredentialsScreen';
import { DemoAccess } from './features/credentials/DemoAccess';

export function App() {
  return (
    <DemoAccess><Routes>
      <Route path="/learn" element={<Academy />} />
      <Route path="/" element={<Navigate to="/certificates" replace />} />
      <Route path="/certificates" element={<CertificateListScreen />} />
      <Route path="/certificates/:tokenId" element={<CertificateDetailScreen />} />
      <Route path="/verify" element={<VerifyScreen />} />
      <Route path="/issue" element={<IssueScreen />} />
      <Route path="/credentials" element={<CredentialsScreen />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes></DemoAccess>
  );
}
