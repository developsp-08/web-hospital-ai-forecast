import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard"; // นำเข้า Component Dashboard
import "./App.css"; // เรียกใช้ไฟล์ CSS ที่เราสร้างไว้

export default function App() {
  return (
    <Router>
      <Routes>
        {/* กำหนดให้หน้าแรก / วิ่งไปที่ Component Dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* ในอนาคตคุณสามารถเพิ่มหน้าอื่นๆ ได้แบบนี้:
        <Route path="/settings" element={<Settings />} /> 
        <Route path="/opd-detail" element={<OpdDetail />} /> 
        */}
      </Routes>
    </Router>
  );
}
