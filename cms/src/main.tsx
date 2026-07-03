import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import './styles.css';

import Login from './pages/Login';
import Users from './pages/Users';
import Admins from './pages/Admins';
import UserDetail from './pages/UserDetail';
import Payments from './pages/Payments';
import Programs from './pages/Programs';
import ProgramEdit from './pages/ProgramEdit';
import Bonuses from './pages/Bonuses';
import Parameters from './pages/Parameters';
import Regulations from './pages/Regulations';
import Faq from './pages/Faq';
import News from './pages/News';
import Statistics from './pages/Statistics';
import SystemPartners from './pages/SystemPartners';
import Files from './pages/Files';

function Protected() {
  const { admin, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!admin) return <Navigate to="/login" replace />;
  return <Layout />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Protected />}>
          <Route path="/" element={<Navigate to="/users" replace />} />
          <Route path="/users" element={<Users />} />
          <Route path="/users-cms" element={<Admins />} />
          <Route path="/user/:id" element={<UserDetail />} />
          <Route path="/payments/:tab" element={<Payments />} />
          <Route path="/payments" element={<Navigate to="/payments/pay-in" replace />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/programs/edit" element={<ProgramEdit />} />
          <Route path="/programs/edit/:id" element={<ProgramEdit />} />
          <Route path="/bonuses" element={<Bonuses />} />
          <Route path="/bonuses/edit" element={<Bonuses />} />
          <Route path="/bonuses/edit/:id" element={<Bonuses />} />
          <Route path="/parameters" element={<Parameters />} />
          <Route path="/regulations" element={<Regulations />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/news" element={<News />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/system-partners" element={<SystemPartners />} />
          <Route path="/files" element={<Files />} />
          <Route path="/files/:id" element={<Files />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
