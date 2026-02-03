import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import HostDashboard from './pages/HostDashboard';
import DriverDashboard from './pages/DriverDashboard';
import DriverProfile from './pages/DriverProfile';
import HostKYC from './pages/HostKYC';
import AdminDashboard from './pages/AdminDashboard';
import ScrollDemo from './pages/ScrollDemo';
import InteractiveButtonDemo from './pages/InteractiveButtonDemo';
import SparklesDemo from './pages/SparklesDemo';
import ParticleEffectDemo from './pages/ParticleEffectDemo';

const App = () => (
  <BrowserRouter>
    <div className="App bg-slate-50">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/host" element={<HostDashboard />} />
        <Route path="/host-kyc" element={<HostKYC />} />
        <Route path="/driver" element={<DriverDashboard />} />
        <Route path="/driver/profile" element={<DriverProfile />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/scroll-demo" element={<ScrollDemo />} />
        <Route path="/interactive-button-demo" element={<InteractiveButtonDemo />} />
        <Route path="/sparkles-demo" element={<SparklesDemo />} />
        <Route path="/particle-effect-demo" element={<ParticleEffectDemo />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  </BrowserRouter>
);

export default App;
