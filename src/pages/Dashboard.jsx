import React, { useState, useEffect } from "react";
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

  const [isLoading, setIsLoading] = useState(true);

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
          axios.get(`${API_BASE_URL}/api/v1/er/forecast`), // เพิ่ม API ER ตรงนี้
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

        // สำหรับกราฟ ER: ดึงข้อมูล chart_data จาก Backend ถ้ามี
        // ถ้า Backend ยังไม่ส่งมา ให้ใช้ข้อมูลจำลองไปก่อนเว็บจะได้ไม่พัง
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
