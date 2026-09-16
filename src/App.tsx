import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BrandPage } from './pages/dev/BrandPage'

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/dev/brand" element={<BrandPage />} />
        <Route path="*" element={<Navigate to="/dev/brand" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
