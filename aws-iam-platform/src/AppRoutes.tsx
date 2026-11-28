import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import App from './App'

const IAMDetails = lazy(() => import('./IAMDetails'))
const IamLab = lazy(() => import('./lab/IamLab'))

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/lab" element={<Suspense fallback={<main className="w">Loading IAM Lab...</main>}><IamLab /></Suspense>} />
        <Route path="/iam" element={<Suspense fallback={<main className="w">Loading IAM guide...</main>}><IAMDetails /></Suspense>} />
        <Route path="/iam/questions/:topicId" element={<Suspense fallback={<main className="w">Loading IAM guide...</main>}><IAMDetails /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
