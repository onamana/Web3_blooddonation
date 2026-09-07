import { Navigate, Route, Routes } from "react-router-dom";
import { DonorApp } from "./features/donor/DonorApp";
import { HospitalConsole } from "./features/hospital/HospitalConsole";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/donor" replace />} />
      <Route path="/donor" element={<DonorApp />} />
      <Route path="/hospital" element={<HospitalConsole />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
