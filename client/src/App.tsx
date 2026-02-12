import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { GenerationProgressProvider } from './contexts/GenerationProgressContext';
import { ToastProvider } from './contexts/ToastContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import GenerationProgress from './components/GenerationProgress';
import SessionExpiredBanner from './components/SessionExpiredBanner';
import PreferencesSync from './components/PreferencesSync';
import ToastContainer from './components/Toast';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import LandingPage from './pages/LandingPage';
import ProjectDetail from './pages/ProjectDetail';
import NotFoundPage from './pages/NotFoundPage';
import NewProject from './pages/NewProject';
import HumanModelPage from './pages/HumanModelPage';
import ChapterEditor from './pages/ChapterEditor';
import AdminUsersPage from './pages/AdminUsersPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

// List of protected routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/projects',
  '/projects/new',
  '/human-model',
  '/sources',
  '/settings',
  '/profile',
  '/admin'
];

// Helper component to check if route is protected
function ProtectedRouteGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();

  // Check if current path starts with any protected route
  const isProtectedRoute = PROTECTED_ROUTES.some(route =>
    location.pathname.startsWith(route) || location.pathname.startsWith('/projects/')
  );

  if (!user && isProtectedRoute) {
    // Store the intended location for redirect after login
    sessionStorage.setItem('redirectAfterLogin', location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }

  // Check if admin route and user is not admin
  const isAdminRoute = location.pathname.startsWith('/admin');
  if (isAdminRoute && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GenerationProgressProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </GenerationProgressProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
      <SessionExpiredBanner />
      <PreferencesSync />
      <ProtectedRouteGuard>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Protected Routes - With Layout */}
          {user ? (
            <>
              <Route
                path="/dashboard"
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
                      <Dashboard />
                    </main>
                  </>
                }
              />
              <Route
                path="/projects"
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
                      <Dashboard />
                    </main>
                  </>
                }
              />
              <Route
                path="/human-model"
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
                      <HumanModelPage />
                    </main>
                  </>
                }
              />
              <Route
                path="/sources"
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
                      <Dashboard />
                    </main>
                  </>
                }
              />
              <Route
                path="/settings"
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
                      <SettingsPage />
                    </main>
                  </>
                }
              />
              <Route
                path="/profile"
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
                      <ProfilePage />
                    </main>
                  </>
                }
              />
              <Route
                path="/admin/users"
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
                      <AdminUsersPage />
                    </main>
                  </>
                }
              />
              <Route
                path="/projects/new"
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
                      <NewProject />
                    </main>
                  </>
                }
              />
              <Route
                path="/projects/:id"
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
                      <ProjectDetail />
                    </main>
                  </>
                }
              />
              <Route
                path="/projects/:id/chapters/:chapterId"
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
                      <ChapterEditor />
                    </main>
                  </>
                }
              />
              {/* 404 page for authenticated users (with layout) */}
              <Route
                path="*"
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
                      <NotFoundPage isInLayout={true} />
                    </main>
                  </>
                }
              />
            </>
          ) : (
            // 404 page for unauthenticated users (standalone)
            // This catches all unmatched routes when not logged in
            <Route path="*" element={<NotFoundPage isInLayout={false} />} />
          )}
        </Routes>
      </ProtectedRouteGuard>
      <GenerationProgress />
      <ToastContainer />
    </div>
  );
}

export default App;
