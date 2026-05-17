import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import DetailBerita from "./pages/DetailBerita";
import SubmitBerita from "./pages/SubmitBerita";
import AdminOverview from "./pages/AdminOverview";
import Login from "./pages/Login";
import MyArticles from "./pages/MyArticles";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications"; // Import halaman notifikasi baru

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/artikel/:id" element={<DetailBerita />} />
        <Route path="/submit" element={<SubmitBerita />} />
        <Route path="/admin" element={<AdminOverview />} />
        <Route path="/login" element={<Login />} />
        <Route path="/my-articles" element={<MyArticles />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} /> {/* Rute baru */}
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}