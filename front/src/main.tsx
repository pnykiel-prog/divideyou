import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles.css';
import { AuthProvider, useAuth } from './auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import News from './pages/News';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';
import Programs from './pages/Programs';
import ProgramDetail from './pages/ProgramDetail';
import LocationDetail from './pages/LocationDetail';
import Bonuses from './pages/Bonuses';
import BonusDetail from './pages/BonusDetail';
import Partnership from './pages/Partnership';
import Faq from './pages/Faq';
import Settings from './pages/Settings';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Root() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register/:partnerNumber" element={<Register />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/news" element={<News />} />
        <Route path="/news/:slug" element={<News />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/:tab" element={<Settings />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/wallet/:tab" element={<Wallet />} />
        <Route path="/programs" element={<Programs vip={false} />} />
        <Route path="/programs/:tab" element={<Programs vip={false} />} />
        <Route path="/vip-programs" element={<Programs vip={true} />} />
        <Route path="/vip-programs/:tab" element={<Programs vip={true} />} />
        <Route path="/program/:id" element={<ProgramDetail />} />
        <Route path="/location/:id" element={<LocationDetail />} />
        <Route path="/bonuses" element={<Bonuses />} />
        <Route path="/bonuses/:tab" element={<Bonuses />} />
        <Route path="/bonus/:id" element={<BonusDetail />} />
        <Route path="/partnership" element={<Partnership />} />
        <Route path="/faq" element={<Faq />} />
      </Route>
      <Route path="*" element={<Navigate to="/news" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
