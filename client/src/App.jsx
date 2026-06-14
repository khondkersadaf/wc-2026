import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Fixtures from './pages/Fixtures';
import MatchDetail from './pages/MatchDetail';
import MyBets from './pages/MyBets';
import Leaderboard from './pages/Leaderboard';
import Admin from './pages/Admin';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.isAdmin ? children : <Navigate to="/" replace />;
}

function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto">
      <main className="flex-1 pb-20">{children}</main>
      <Navbar />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout>
                  <Navigate to="/fixtures" replace />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/fixtures"
            element={
              <PrivateRoute>
                <Layout>
                  <Fixtures />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/fixtures/:id"
            element={
              <PrivateRoute>
                <Layout>
                  <MatchDetail />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/my-bets"
            element={
              <PrivateRoute>
                <Layout>
                  <MyBets />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <PrivateRoute>
                <Layout>
                  <Leaderboard />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout>
                    <Admin />
                  </Layout>
                </AdminRoute>
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
