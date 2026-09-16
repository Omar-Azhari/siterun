import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui'
import { BrandPage } from './pages/dev/BrandPage'
import { ComponentsPage } from './pages/dev/ComponentsPage'

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <Routes>
          <Route path="/dev/brand" element={<BrandPage />} />
          <Route path="/dev/components" element={<ComponentsPage />} />
          <Route path="*" element={<Navigate to="/dev/components" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
