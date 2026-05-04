import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import ITPExecution from './pages/ITPExecution';
import TemplateBuilder from './pages/TemplateBuilder';
import NCRList from './pages/NCRList';
import NCRDetail from './pages/NCRDetail';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
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
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
