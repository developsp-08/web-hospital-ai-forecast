import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Users,
  Activity,
  Bed,
  AlertTriangle,
  CloudRain,
  Calendar,
  MapPin,
  Upload,
  Clock,
  Sun,
  Moon,
  UserCheck,
  Stethoscope,
} from "lucide-react";

import "./style/Dashboard.css"; // ตรวจสอบ Path ให้ตรงกับโฟลเดอร์ของคุณ

export default function Dashboard() {
  // 1. สร้าง State สำหรับรับข้อมูลจาก Backend ให้ครบทุกตัว
  const [icuOccupancy, setIcuOccupancy] = useState(0);
  const [dengueRisk, setDengueRisk] = useState("Loading...");
  const [opdForecastData, setOpdForecastData] = useState([]);

  // State สำหรับ ER
  const [erCurrentLoad, setErCurrentLoad] = useState("0%");
  const [erPeakHour, setErPeakHour] = useState("Loading...");
  const [erChartData, setErChartData] = useState([]);

  // State สำหรับสถานะการอัปโหลดไฟล์ตารางเวร
  const [uploadStatus, setUploadStatus] = useState(null);

  // State ข้อมูลแนะนำการจัดตารางพยาบาล ภาพรวม
  const [staffingData, setStaffingData] = useState([
    {
      ward: "ER",
      shift: "Morning (08-16)",
      predictedPatients: 45,
      currentStaff: 5,
      recommendedStaff: 7,
      status: "Shortage",
    },
    {
      ward: "ER",
      shift: "Afternoon (16-00)",
      predictedPatients: 65,
      currentStaff: 6,
      recommendedStaff: 6,
      status: "Optimal",
    },
    {
      ward: "ICU",
      shift: "Morning (08-16)",
      predictedPatients: 12,
      currentStaff: 4,
      recommendedStaff: 6,
      status: "Shortage",
    },
    {
      ward: "OPD",
      shift: "Morning (08-16)",
      predictedPatients: 850,
      currentStaff: 15,
      recommendedStaff: 15,
      status: "Optimal",
    },
  ]);

  // State ข้อมูลตารางเวรรายบุคคล (Individual Shift Schedule)
  const [nurseSchedule, setNurseSchedule] = useState([
    {
      id: 1,
      name: "RN. อรวรรณ ใจดี",
      ward: "ER",
      shiftType: "Day",
      time: "08:00 - 16:00",
      hours: 8,
    },
    {
      id: 2,
      name: "RN. สมชาย มุ่งมั่น",
      ward: "ER",
      shiftType: "Night",
      time: "16:00 - 00:00",
      hours: 8,
    },
    {
      id: 3,
      name: "RN. วิภาดา รักษา",
      ward: "ICU",
      shiftType: "Day",
      time: "08:00 - 20:00",
      hours: 12,
    },
    {
      id: 4,
      name: "RN. นิภา อารี",
      ward: "OPD",
      shiftType: "Day",
      time: "08:00 - 16:00",
      hours: 8,
    },
    {
      id: 5,
      name: "RN. กิตติพงษ์ เก่งกาจ",
      ward: "ER",
      shiftType: "Night",
      time: "00:00 - 08:00",
      hours: 8,
    },
  ]);

  const [isLoading, setIsLoading] = useState(true);

  // ==========================================
  // States และฟังก์ชันสำหรับ Drag & Drop Calendar
  // ==========================================
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // รายชื่อหมอสำหรับให้ลาก (Sidebar)
  const [doctorsList] = useState([
    {
      id: "dr1",
      name: "Dr. สมพล",
      specialty: "ER Attending",
      colorClass: "db-vs-bg-day",
    },
    {
      id: "dr2",
      name: "Dr. วนิดา",
      specialty: "Trauma Surgeon",
      colorClass: "db-vs-bg-night",
    },
    {
      id: "dr3",
      name: "Dr. นิธิ",
      specialty: "ICU Specialist",
      colorClass: "db-vs-bg-purple",
    },
    {
      id: "dr4",
      name: "Dr. สุชาติ",
      specialty: "General Practice",
      colorClass: "db-vs-bg-green",
    },
  ]);

  // เก็บข้อมูลกะที่ถูกลากลงตารางแล้ว
  const [doctorShifts, setDoctorShifts] = useState([
    { id: "s1", doctorId: "dr1", day: "Mon", startHour: 8, duration: 8 },
    { id: "s2", doctorId: "dr2", day: "Wed", startHour: 16, duration: 8 },
  ]);

  const [currentTimePosition, setCurrentTimePosition] = useState(0);
  const scrollRef = useRef(null);

  // ฟังก์ชันเริ่มลาก (ส่ง ID ของหมอไปกับ Event)
  const handleDragStart = (e, doctorId) => {
    e.dataTransfer.setData("doctorId", doctorId);
  };

  // อนุญาตให้วางของได้
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // ฟังก์ชันเมื่อปล่อยเมาส์ลงตาราง
  const handleDrop = (e, targetDay) => {
    e.preventDefault();
    const doctorId = e.dataTransfer.getData("doctorId");
    if (!doctorId) return;

    // คำนวณชั่วโมงจากตำแหน่งเมาส์แนวตั้ง (Y) เทียบกับช่องที่วาง
    // 1 ชั่วโมง = 60px
    const rect = e.currentTarget.getBoundingClientRect();
    const yPosition = e.clientY - rect.top;
    let startHour = Math.floor(yPosition / 60);

    if (startHour < 0) startHour = 0;

    // บังคับให้เป็น 8 ชั่วโมงเสมอ ดังนั้นเวลาเริ่มสูงสุดคือ 16:00 (16 + 8 = 24)
    if (startHour + 8 > 24) startHour = 16;

    const newShift = {
      id: Date.now().toString(),
      doctorId,
      day: targetDay,
      startHour,
      duration: 8, // ฟิกกะ 8 ชั่วโมงตามโจทย์
    };

    setDoctorShifts([...doctorShifts, newShift]);
  };

  // ==========================================

  // ฟังก์ชันจัดกการการอัปโหลดไฟล์
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadStatus("Uploading...");
    // จำลองการส่งไฟล์ไปหา FastAPI
    setTimeout(() => {
      setUploadStatus("✅ Schedule Updated!");
      setTimeout(() => setUploadStatus(null), 3000);
    }, 1500);
  };

  // 2. ใช้ useEffect เพื่อยิง API ทันทีที่โหลดหน้าเสร็จ
  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    const fetchDashboardData = async () => {
      try {
        // ยิง API 4 เส้นพร้อมกัน
        const [icuRes, dengueRes, opdRes, erRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/v1/icu/forecast`),
          axios.get(`${API_BASE_URL}/api/v1/dengue/forecast`),
          axios.get(`${API_BASE_URL}/api/v1/opd/forecast?days=7`),
          axios.get(`${API_BASE_URL}/api/v1/er/forecast`),
        ]);

        // --- จัดการข้อมูล ICU & Dengue ---
        setIcuOccupancy(icuRes.data.data.occupancy_rate);
        setDengueRisk(icuRes.data.data.risk_level);

        // --- จัดการข้อมูล OPD ---
        const formattedOpdData = opdRes.data.data.map((item) => ({
          date: item.date,
          actual: null,
          predicted: item.volume,
        }));
        const combinedOpdData = [
          { date: "Day 0 (Today)", actual: 1450, predicted: 1400 },
          ...formattedOpdData,
        ];
        setOpdForecastData(combinedOpdData);

        // --- จัดการข้อมูล ER ---
        setErCurrentLoad(erRes.data.data.current_load);
        setErPeakHour(erRes.data.data.peak_hour);

        const defaultErChart = [
          { hour: "08:00", load: 40 },
          { hour: "10:00", load: 65 },
          { hour: "12:00", load: 85 },
          { hour: "14:00", load: 70 },
          { hour: "16:00", load: 90 },
          { hour: "18:00", load: 110 },
          { hour: "20:00", load: 80 },
        ];
        setErChartData(erRes.data.data.chart_data || defaultErChart);

        setIsLoading(false);
      } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    // ดึงเวลาปัจจุบันเพื่อสร้างเส้นสีแดงในปฏิทิน
    const updateCurrentTimeLine = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      setCurrentTimePosition(h * 60 + m);
    };

    updateCurrentTimeLine();
    const timer = setInterval(updateCurrentTimeLine, 60000); // อัปเดตทุก 1 นาที

    // เลื่อนหน้าจอไปที่เวลาปัจจุบันอัตโนมัติ (ลบออก 2 ชั่วโมงให้เห็นหัวตารางด้วย)
    setTimeout(() => {
      if (scrollRef.current) {
        const now = new Date();
        const scrollPosition = (now.getHours() - 2) * 60;
        scrollRef.current.scrollTop = scrollPosition > 0 ? scrollPosition : 0;
      }
    }, 500);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="db-container">
      {/* Header */}
      <header className="db-header">
        <div>
          <h1>Hospital AI Forecast</h1>
          <p>Predictive Analytics Dashboard</p>
        </div>
        <div className="db-location-box">
          {/* ส่วนปุ่มอัปโหลด */}
          <div className="db-upload-section">
            {uploadStatus && (
              <span className="db-upload-status">{uploadStatus}</span>
            )}
            <label htmlFor="schedule-upload" className="db-upload-btn">
              <Upload size={18} /> Upload Today's Schedule
            </label>
            <input
              type="file"
              id="schedule-upload"
              style={{ display: "none" }}
              accept=".csv, .xlsx"
              onChange={handleFileUpload}
            />
          </div>

          <div className="db-location-wrapper">
            <MapPin size={16} className="db-map-icon" />
            Ban Khlong Suan, Samut Prakan
          </div>
          <div className="db-time-text">Mon, 2 Mar 2026 | 17:55 น.</div>
        </div>
      </header>

      {/* Loading State */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>
          <h2>⏳ กำลังเชื่อมต่อกับ AI Backend...</h2>
        </div>
      ) : (
        <>
          {/* 4 Key Metrics Cards */}
          <div className="db-metrics-grid">
            <div className="db-card db-card-blue">
              <div className="db-card-title">
                <Users size={20} color="#2563eb" /> Daily OPD Volume
              </div>
              <div className="db-card-value">
                1,450 <span className="db-trend-up">▲ 5%</span>
              </div>
            </div>

            <div className="db-card db-card-rose">
              <div className="db-card-title">
                <Activity size={20} color="#e11d48" /> ER Load (Current)
              </div>
              <div className="db-card-value db-value-rose">
                {erCurrentLoad}{" "}
                <span className="db-er-peak-text">Peak at {erPeakHour}</span>
              </div>
            </div>

            <div className="db-card db-card-purple">
              <div className="db-card-title">
                <Bed size={20} color="#9333ea" /> ICU Occupancy
              </div>
              <div className="db-card-value">
                {icuOccupancy}%{" "}
                <span className="db-trend-down">2 Beds Left</span>
              </div>
            </div>

            <div className="db-card db-card-orange">
              <div className="db-card-title">
                <AlertTriangle size={20} color="#ea580c" /> Dengue (Next 14
                Days)
              </div>
              <div className="db-card-value db-value-orange">{dengueRisk}</div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="db-charts-grid">
            {/* Main Chart: OPD Forecast */}
            <div className="db-chart-card">
              <div className="db-chart-header">
                <span className="db-dot db-dot-blue"></span>
                7-Day OPD Volume Forecast (ARIMA/Prophet)
              </div>
              <div className="db-chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={opdForecastData}
                    margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorActual"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop offset="0%" stopColor="#1e3a8a" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#cbd5e1"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#475569", fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#475569", fontWeight: 500 }}
                      dx={-10}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                        fontWeight: "500",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ paddingTop: "10px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual Volume"
                      stroke="url(#colorActual)"
                      strokeWidth={4}
                      dot={{
                        r: 5,
                        fill: "#1e3a8a",
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      name="Predicted Volume"
                      stroke="#94a3b8"
                      strokeWidth={3}
                      strokeDasharray="6 6"
                      dot={{
                        r: 4,
                        fill: "#94a3b8",
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Side Chart: Hourly ER Load */}
            <div className="db-chart-card">
              <div className="db-chart-header">
                <span className="db-dot db-dot-rose"></span>
                Hourly ER Load Prediction (LSTM)
              </div>
              <div className="db-chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={erChartData}
                    margin={{ top: 5, right: 0, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" />
                        <stop offset="100%" stopColor="#be123c" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#cbd5e1"
                    />
                    <XAxis
                      dataKey="hour"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
                      dx={-10}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(226, 232, 240, 0.4)" }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <ReferenceLine
                      y={100}
                      stroke="#ef4444"
                      strokeDasharray="3 3"
                      label={{
                        position: "insideTopLeft",
                        value: "Overcapacity",
                        fill: "#ef4444",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    />
                    <Bar
                      dataKey="load"
                      name="ER Patient Count"
                      fill="url(#colorBar)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Staffing Recommendation Table (ตารางภาพรวม) */}
          <div className="db-staffing-card">
            <div className="db-staffing-header">
              <div className="db-staffing-header-left">
                <Users size={22} color="#2563eb" />
                <h2>AI Staffing Recommendation (Tomorrow)</h2>
              </div>
            </div>
            <div className="db-table-responsive">
              <table className="db-staffing-table">
                <thead>
                  <tr>
                    <th>Ward</th>
                    <th>Shift</th>
                    <th>Predicted Patients</th>
                    <th>Current Scheduled</th>
                    <th className="th-highlight">AI Recommended</th>
                    <th>Action Required</th>
                  </tr>
                </thead>
                <tbody>
                  {staffingData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="td-bold">{row.ward}</td>
                      <td>{row.shift}</td>
                      <td>{row.predictedPatients} </td>
                      <td>{row.currentStaff} </td>
                      <td className="td-highlight">{row.recommendedStaff}</td>
                      <td>
                        {row.status === "Shortage" ? (
                          <span className="badge-shortage">
                            Need +{row.recommendedStaff - row.currentStaff}{" "}
                            Nurse
                          </span>
                        ) : (
                          <span className="badge-optimal">Optimal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ตารางเวรรายบุคคล (Detailed Nurse Shift Schedule) */}
          <div
            className="db-staffing-card"
            style={{ marginTop: "1.5rem", marginBottom: "2rem" }}
          >
            <div className="db-staffing-header">
              <Clock size={22} color="#9333ea" />
              <h2>Detailed Nurse Shift Schedule (Tomorrow)</h2>
            </div>
            <div className="db-table-responsive">
              <table className="db-staffing-table">
                <thead>
                  <tr>
                    <th>Nurse Name</th>
                    <th>Ward</th>
                    <th>Shift Type</th>
                    <th>Time (Start - End)</th>
                    <th>Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {nurseSchedule.map((staff) => (
                    <tr key={staff.id}>
                      <td className="td-bold">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <UserCheck size={16} color="#475569" />
                          {staff.name}
                        </div>
                      </td>
                      <td>{staff.ward}</td>
                      <td>
                        {staff.shiftType === "Day" ? (
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              color: "#d97706",
                              fontWeight: 600,
                            }}
                          >
                            <Sun size={18} color="#eab308" /> Day Shift
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              color: "#4338ca",
                              fontWeight: 600,
                            }}
                          >
                            <Moon size={18} color="#6366f1" /> Night Shift
                          </span>
                        )}
                      </td>
                      <td style={{ color: "#475569", fontWeight: 500 }}>
                        {staff.time}
                      </td>
                      <td>
                        <strong
                          style={{ fontSize: "1.1rem", color: "#0f172a" }}
                        >
                          {staff.hours}
                        </strong>
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: "#64748b",
                            marginLeft: "4px",
                          }}
                        >
                          hrs
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ======================================================= */}
          {/* ส่วนที่แก้ไข: Drag & Drop Visual Schedule Timeline */}
          {/* ======================================================= */}
          <div
            className="db-staffing-card"
            style={{ marginTop: "1.5rem", marginBottom: "2rem" }}
          >
            <div className="db-staffing-header">
              <div className="db-staffing-header-left">
                <Calendar size={22} color="#f43f5e" />
                <h2>Weekly Doctor Assignment (Drag & Drop)</h2>
              </div>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                * Drag the doctor's name onto the schedule to create an 8-hour shift.
              </span>
            </div>

            <div className="db-dnd-container">
              {/* แถบด้านซ้าย: รายชื่อหมอ (Draggable Items) */}
              <div className="db-dnd-sidebar">
                <div className="db-dnd-sidebar-title">Available Doctors</div>
                {doctorsList.map((doc) => (
                  <div
                    key={doc.id}
                    className="db-dnd-doctor-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, doc.id)}
                  >
                    <div className="db-dnd-doc-name">
                      <Stethoscope size={16} color="#3b82f6" /> {doc.name}
                    </div>
                    <div className="db-dnd-doc-spec">{doc.specialty}</div>
                  </div>
                ))}
              </div>

              {/* แถบด้านขวา: ปฏิทิน (Drop Zones) */}
              <div className="db-visual-schedule-wrapper">
                {/* Header (จันทร์ - อาทิตย์) */}
                <div className="db-vs-header">
                  <div className="db-vs-time-spacer"></div>
                  {daysOfWeek.map((day) => (
                    <div key={day} className="db-vs-person-col-header">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Body ของปฏิทิน */}
                <div className="db-vs-body" ref={scrollRef}>
                  {/* เส้นแดงบอกเวลาปัจจุบัน */}
                  <div
                    className="db-vs-current-time-line"
                    style={{ top: `${currentTimePosition}px` }}
                  ></div>
                  <div
                    className="db-vs-current-time-dot"
                    style={{ top: `${currentTimePosition}px` }}
                  ></div>

                  {/* แกนเวลาด้านซ้าย (00:00 - 23:00) */}
                  <div className="db-vs-time-axis">
                    {[...Array(24)].map((_, i) => (
                      <div key={`time-${i}`} className="db-vs-time-slot">
                        {i !== 0 && (
                          <span className="db-vs-time-text">
                            {i === 12
                              ? "12 PM"
                              : i > 12
                                ? `${i - 12} PM`
                                : `${i} AM`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* คอลัมน์ของแต่ละวัน (Drop Target) */}
                  <div className="db-vs-grid-columns">
                    {daysOfWeek.map((day) => (
                      <div
                        key={day}
                        className="db-vs-person-col"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day)}
                      >
                        {/* ดึงเฉพาะกะของวันนี้มาแสดง */}
                        {doctorShifts
                          .filter((shift) => shift.day === day)
                          .map((shift) => {
                            const docInfo = doctorsList.find(
                              (d) => d.id === shift.doctorId,
                            );
                            if (!docInfo) return null;

                            // คำนวณตำแหน่ง 1 ชม. = 60px
                            const topPos = shift.startHour * 60;
                            const height = shift.duration * 60;

                            return (
                              <div
                                key={shift.id}
                                className={`db-vs-event-block ${docInfo.colorClass}`}
                                style={{
                                  top: `${topPos}px`,
                                  height: `${height}px`,
                                }}
                                title={`${docInfo.name} (${shift.startHour}:00 - ${shift.startHour + shift.duration}:00)`}
                              >
                                <div className="db-vs-event-title">
                                  {docInfo.name}
                                </div>
                                <div className="db-vs-event-desc">
                                  {`${shift.startHour}:00 - ${shift.startHour + shift.duration}:00`}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* External Factors Section */}
          <div className="db-factors-grid">
            <div className="db-factor-card">
              <div className="db-icon-box db-icon-blue">
                <CloudRain size={28} />
              </div>
              <div className="db-factor-content">
                <h3>Weather Trigger (Samut Prakan)</h3>
                <p>
                  Accumulated rainfall over the past 14 days is{" "}
                  <strong>25% higher</strong> than average. High humidity (82%)
                  observed.
                  <span className="db-action-text">
                    Action: Prepare for potential Dengue surge in weeks 2-4.
                  </span>
                </p>
              </div>
            </div>
            <div className="db-factor-card">
              <div className="db-icon-box db-icon-purple">
                <Calendar size={28} />
              </div>
              <div className="db-factor-content db-factor-content-full">
                <h3>Local Events & ER Impact</h3>
                <ul className="db-factor-list">
                  <li>
                    <span>Concert at Arena (10k pax)</span>
                    <span className="db-risk-rose">+15% ER Risk tonight</span>
                  </li>
                  <li>
                    <span>Long Weekend Tomorrow</span>
                    <span className="db-risk-orange">High Trauma Risk</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
