import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Auth pages: eagerly loaded — tiny and needed immediately on app start
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
// Public token pages: eagerly loaded — accessed without auth
import ExternalSignOff from './pages/ExternalSignOff';
import WitnessPointResponse from './pages/WitnessPointResponse';

// Protected pages: lazily loaded — code-split per route to reduce initial bundle
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'));
const ITPExecution = lazy(() => import('./pages/ITPExecution'));
const TemplateBuilder = lazy(() => import('./pages/TemplateBuilder'));
const TemplateLibrary = lazy(() => import('./pages/TemplateLibrary'));
const NCRList = lazy(() => import('./pages/NCRList'));
const NCRDetail = lazy(() => import('./pages/NCRDetail'));
const UserManagement = lazy(() => import('./pages/UserManagement'));

import './App.css';

const PageLoader = () => <div className="loading">Loading…</div>;

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register/:token" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/external-sign-off/:token" element={<ExternalSignOff />} />
              <Route path="/wp-response/:token" element={<WitnessPointResponse />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id"
                element={
                  <ProtectedRoute>
                    <ProjectDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:projectId/templates/new"
                element={
                  <ProtectedRoute>
                    <TemplateBuilder />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:projectId/templates/library"
                element={
                  <ProtectedRoute>
                    <TemplateLibrary />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/itp/:id"
                element={
                  <ProtectedRoute>
                    <ITPExecution />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ncrs"
                element={
                  <ProtectedRoute>
                    <NCRList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ncrs/:id"
                element={
                  <ProtectedRoute>
                    <NCRDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </Router>
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
