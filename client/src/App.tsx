import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';
import ProjectDetail from './pages/ProjectDetail';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Mock recent projects - will be replaced with real data
  const recentProjects: Array<{
    id: number;
    title: string;
    area: 'romanziere' | 'saggista' | 'redattore';
    updated_at: string;
  }> = [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes - With Layout */}
        {user ? (
          <Route
            path="/*"
            element={
              <>
                <Sidebar
                  isCollapsed={isSidebarCollapsed}
                  onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  recentProjects={recentProjects}
                />
                <Header isSidebarCollapsed={isSidebarCollapsed} />
                <main
                  className={`
                    fixed top-16 right-0 bottom-0 overflow-y-auto
                    transition-all duration-300 bg-white dark:bg-dark-bg
                    ${isSidebarCollapsed ? 'left-16' : 'left-64'}
                  `}
                >
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/projects" element={<Dashboard />} />
                    <Route path="/human-model" element={<Dashboard />} />
                    <Route path="/sources" element={<Dashboard />} />
                    <Route path="/settings" element={<Dashboard />} />
                    <Route path="/profile" element={<Dashboard />} />
                    <Route path="/projects/:id" element={<ProjectDetail />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </main>
              </>
            }
          />
        ) : (
          // Redirect to login if trying to access protected route
          <Route path="/*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </div>
  );
}

export default App;
