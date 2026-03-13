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
  ShieldAlert,
  X,
  Info,
} from "lucide-react";

import "./style/Dashboard.css"; // Ensure this path matches your folder structure

export default function Dashboard() {
  const [icuOccupancy, setIcuOccupancy] = useState(0);
  const [dengueRisk, setDengueRisk] = useState("Loading...");
  const [opdForecastData, setOpdForecastData] = useState([]);

  const [erCurrentLoad, setErCurrentLoad] = useState("0%");
  const [erPeakHour, setErPeakHour] = useState("Loading...");
  const [erChartData, setErChartData] = useState([]);

  const [uploadStatus, setUploadStatus] = useState(null);

  const [selectedNurse, setSelectedNurse] = useState(null);

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

  const [nurseSchedule, setNurseSchedule] = useState([
    {
      id: 1,
      name: "RN. Orawan Jaidee",
      ward: "ER",
      shiftType: "Day",
      time: "08:00 - 16:00",
      hours: 8,
    },
    {
      id: 2,
      name: "RN. Somchai Mungmun",
      ward: "ER",
      shiftType: "Night",
      time: "16:00 - 00:00",
      hours: 8,
    },
    {
      id: 3,
      name: "RN. Wipada Raksa",
      ward: "ICU",
      shiftType: "Day",
      time: "08:00 - 20:00",
      hours: 12,
    },
    {
      id: 4,
      name: "RN. Nipa Aree",
      ward: "OPD",
      shiftType: "Day",
      time: "08:00 - 16:00",
      hours: 8,
    },
    {
      id: 5,
      name: "RN. Kittipong Kengkat",
      ward: "ER",
      shiftType: "Night",
      time: "00:00 - 08:00",
      hours: 8,
    },
  ]);

  const [isLoading, setIsLoading] = useState(true);

  // ==========================================
  // Drag & Drop Monthly Grid Calendar Setup
  // ==========================================
  const [selectedWard, setSelectedWard] = useState("All");

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthDays = Array.from({ length: 31 }, (_, i) => i + 1);
  const currentDay = new Date().getDate();

  const getStyleClass = (ward, level, isFilled) => {
    let base = "default";
    if (ward === "ER" && level === "Level 4") base = "er-l4";
    else if (ward === "ER" && level === "Level 3") base = "er-l3";
    else if (ward === "ICU" && level === "Level 4") base = "icu-l4";
    else if (ward === "ICU" && level === "Level 3") base = "icu-l3";
    else if (ward === "OPD" && level === "Level 3") base = "opd-l3";
    else if (ward === "OPD" && level === "Part-time") base = "opd-pt";

    return isFilled ? `bg-${base}` : `border-${base}`;
  };

  // Any nurse can work Day or Night. Tracked by dayHours and nightHours.
  const [nursesList] = useState([
    {
      id: "n1",
      name: "RN. Orawan",
      level: "Level 4",
      maxHours: 12,
      ward: "ER",
      dayHours: 80,
      nightHours: 64,
    },
    {
      id: "n2",
      name: "RN. Somchai",
      level: "Level 3",
      maxHours: 12,
      ward: "ER",
      dayHours: 40,
      nightHours: 80,
    },
    {
      id: "n3",
      name: "RN. Wipada",
      level: "Level 3",
      maxHours: 12,
      ward: "ICU",
      dayHours: 96,
      nightHours: 0,
    },
    {
      id: "n4",
      name: "RN. Nipa",
      level: "Part-time",
      maxHours: 8,
      ward: "OPD",
      dayHours: 48,
      nightHours: 0,
    },
    {
      id: "n5",
      name: "RN. Kittipong",
      level: "Level 4",
      maxHours: 12,
      ward: "ER",
      dayHours: 60,
      nightHours: 100,
    },
    {
      id: "n6",
      name: "RN. Somsri",
      level: "Level 4",
      maxHours: 12,
      ward: "ICU",
      dayHours: 90,
      nightHours: 90,
    },
    {
      id: "n7",
      name: "RN. Malee",
      level: "Level 3",
      maxHours: 12,
      ward: "OPD",
      dayHours: 60,
      nightHours: 50,
    },
  ]);

  const generateMonthlyRequirements = () => {
    let reqs = [];
    const wards = ["ER", "ICU", "OPD"];

    monthDays.forEach((day) => {
      wards.forEach((ward) => {
        if (ward === "ER") {
          if (Math.random() > 0.4)
            reqs.push({
              id: `req-${ward}-1-${day}`,
              day,
              ward,
              startHour: 8,
              duration: 8,
              reqLevel: "Level 4",
              reqShift: "Day",
              filledBy: null,
            });
          if (Math.random() > 0.6)
            reqs.push({
              id: `req-${ward}-2-${day}`,
              day,
              ward,
              startHour: 16,
              duration: 8,
              reqLevel: "Level 3",
              reqShift: "Night",
              filledBy: null,
            });
        } else if (ward === "ICU") {
          if (Math.random() > 0.5)
            reqs.push({
              id: `req-${ward}-1-${day}`,
              day,
              ward,
              startHour: 8,
              duration: 12,
              reqLevel: "Level 4",
              reqShift: "Day",
              filledBy: null,
            });
          if (Math.random() > 0.7)
            reqs.push({
              id: `req-${ward}-2-${day}`,
              day,
              ward,
              startHour: 20,
              duration: 12,
              reqLevel: "Level 3",
              reqShift: "Night",
              filledBy: null,
            });
        } else if (ward === "OPD") {
          if (Math.random() > 0.6)
            reqs.push({
              id: `req-${ward}-1-${day}`,
              day,
              ward,
              startHour: 8,
              duration: 8,
              reqLevel: "Level 3",
              reqShift: "Day",
              filledBy: null,
            });
          if (Math.random() > 0.8)
            reqs.push({
              id: `req-${ward}-2-${day}`,
              day,
              ward,
              startHour: 12,
              duration: 4,
              reqLevel: "Part-time",
              reqShift: "Day",
              filledBy: null,
            });
        }
      });
    });
    return reqs;
  };

  const [shiftRequirements, setShiftRequirements] = useState(
    generateMonthlyRequirements(),
  );

  const handleDragStart = (e, nurseId) => {
    e.dataTransfer.setData("nurseId", nurseId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, reqId) => {
    e.preventDefault();
    const nurseId = e.dataTransfer.getData("nurseId");
    if (!nurseId) return;

    const nurse = nursesList.find((n) => n.id === nurseId);
    const req = shiftRequirements.find((r) => r.id === reqId);

    if (!nurse || !req) return;

    // Validation Rules (Shift type restriction removed, anyone can work Day or Night)
    if (nurse.level !== req.reqLevel) {
      alert(
        `Error: This slot requires a ${req.reqLevel} nurse. Selected nurse is ${nurse.level}.`,
      );
      return;
    }
    if (nurse.maxHours < req.duration) {
      alert(
        `Error: This slot requires ${req.duration} hours. Selected nurse can work max ${nurse.maxHours} hours/shift.`,
      );
      return;
    }
    if (nurse.ward !== req.ward) {
      alert(
        `Error: This slot is for ${req.ward} ward. Selected nurse belongs to ${nurse.ward}.`,
      );
      return;
    }

    setShiftRequirements((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, filledBy: nurseId } : r)),
    );
  };

  const filteredNurses = nursesList.filter(
    (n) => selectedWard === "All" || n.ward === selectedWard,
  );

  // ==========================================

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadStatus("Uploading...");
    setTimeout(() => {
      setUploadStatus("Schedule Updated Successfully!");
      setTimeout(() => setUploadStatus(null), 3000);
    }, 1500);
  };

  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    const fetchDashboardData = async () => {
      try {
        const [icuRes, dengueRes, opdRes, erRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/v1/icu/forecast`),
          axios.get(`${API_BASE_URL}/api/v1/dengue/forecast`),
          axios.get(`${API_BASE_URL}/api/v1/opd/forecast?days=7`),
          axios.get(`${API_BASE_URL}/api/v1/er/forecast`),
        ]);

        setIcuOccupancy(icuRes.data.data.occupancy_rate);
        setDengueRisk(icuRes.data.data.risk_level);

        const formattedOpdData = opdRes.data.data.map((item) => ({
          date: item.date,
          actual: null,
          predicted: item.volume,
        }));
        const combinedOpdData = [
          { date: "Day 0", actual: 1450, predicted: 1400 },
          ...formattedOpdData,
        ];
        setOpdForecastData(combinedOpdData);

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
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="db-container">
      {/* Overlay Panel for Nurse Details */}
      {selectedNurse && (
        <div
          className="db-nurse-panel-overlay"
          onClick={() => setSelectedNurse(null)}
        >
          <div
            className="db-nurse-panel-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="db-np-header">
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Info size={20} color="#2563eb" />
                <h3 style={{ margin: 0, color: "#1e293b" }}>Staff Profile</h3>
              </div>
              <button
                className="db-np-close-btn"
                onClick={() => setSelectedNurse(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="db-np-body">
              <div className="db-np-avatar">
                <UserCheck size={40} color="#94a3b8" />
              </div>
              <h2 className="db-np-name">{selectedNurse.name}</h2>
              <div className="db-np-badge-container">
                <span className="db-badge-level">{selectedNurse.level}</span>
                <span className="db-np-ward-badge">{selectedNurse.ward}</span>
              </div>

              <div className="db-np-info-grid">
                <div className="db-np-info-item">
                  <span className="db-np-label">Max Hours / Shift</span>
                  <span className="db-np-value">{selectedNurse.maxHours}h</span>
                </div>
                <div className="db-np-info-item">
                  <span className="db-np-label">Day Shift Hours</span>
                  <span
                    className="db-np-value"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Sun size={14} color="#d97706" /> {selectedNurse.dayHours}h
                  </span>
                </div>
                <div className="db-np-info-item">
                  <span className="db-np-label">Night Shift Hours</span>
                  <span
                    className="db-np-value"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Moon size={14} color="#4338ca" />{" "}
                    {selectedNurse.nightHours}h
                  </span>
                </div>
                <div className="db-np-info-item">
                  <span className="db-np-label">Total Hours</span>
                  <span
                    className={`db-np-value ${selectedNurse.dayHours + selectedNurse.nightHours > 150 ? "text-danger" : "text-success"}`}
                  >
                    {selectedNurse.dayHours + selectedNurse.nightHours}h
                  </span>
                </div>
                <div
                  className="db-np-info-item"
                  style={{ gridColumn: "1 / -1" }}
                >
                  <span className="db-np-label">Status</span>
                  <span
                    className={`db-np-value ${selectedNurse.dayHours + selectedNurse.nightHours > 150 ? "text-danger" : "text-success"}`}
                  >
                    {selectedNurse.dayHours + selectedNurse.nightHours > 150
                      ? "Overtime Warning"
                      : "Active & Available"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="db-header">
        <div>
          <h1>Hospital AI Forecast</h1>
          <p>Predictive Analytics Dashboard</p>
        </div>
        <div className="db-location-box">
          <div className="db-upload-section">
            {uploadStatus && (
              <span className="db-upload-status">{uploadStatus}</span>
            )}
            <label htmlFor="schedule-upload" className="db-upload-btn">
              <Upload size={18} /> Upload Schedule
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
          <div className="db-time-text">Live Update Active</div>
        </div>
      </header>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>
          <h2>Connecting to AI Backend...</h2>
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="db-metrics-grid">
            <div className="db-card db-card-blue">
              <div className="db-card-title">
                <Users size={20} color="#2563eb" /> Daily OPD Volume
              </div>
              <div className="db-card-value">
                1,450 <span className="db-trend-up">+ 5%</span>
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
                <AlertTriangle size={20} color="#ea580c" /> Dengue Risk
              </div>
              <div className="db-card-value db-value-orange">{dengueRisk}</div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="db-charts-grid">
            <div className="db-chart-card">
              <div className="db-chart-header">
                <span className="db-dot db-dot-blue"></span>
                7-Day OPD Volume Forecast (AI Model)
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

            <div className="db-chart-card">
              <div className="db-chart-header">
                <span className="db-dot db-dot-rose"></span>
                Hourly ER Load Prediction
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

          {/* Staffing Recommendation Table */}
          <div className="db-staffing-card">
            <div className="db-staffing-header">
              <div className="db-staffing-header-left">
                <Users size={22} color="#2563eb" />
                <h2>AI Staffing Recommendation</h2>
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

          {/* Detailed Nurse Shift Schedule */}
          <div
            className="db-staffing-card"
            style={{ marginTop: "1.5rem", marginBottom: "2rem" }}
          >
            <div className="db-staffing-header">
              <Clock size={22} color="#9333ea" />
              <h2>Detailed Nurse Shift Schedule</h2>
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
          {/* Monthly Visual AI Scheduler (Grid View) */}
          {/* ======================================================= */}
          <div
            className="db-staffing-card"
            style={{ marginTop: "1.5rem", marginBottom: "2rem" }}
          >
            <div className="db-staffing-header">
              <div className="db-staffing-header-left">
                <Calendar size={22} color="#f43f5e" />
                <h2>Monthly Ward Scheduling (AI Recommendations)</h2>

                {/* Dropdown Filter */}
                <select
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="db-ward-select"
                >
                  <option value="All">All Wards</option>
                  <option value="ER">ER Unit</option>
                  <option value="ICU">ICU Unit</option>
                  <option value="OPD">OPD Unit</option>
                </select>
              </div>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Drag a matching nurse onto the dashed AI slots. Click on a nurse
                to view details.
              </span>
            </div>

            <div className="db-dnd-container">
              {/* Sidebar: Available Nurses (Filtered) */}
              <div className="db-dnd-sidebar">
                <div className="db-dnd-sidebar-title">Available Nurses</div>
                <div className="db-dnd-nurse-list">
                  {filteredNurses.map((nurse) => {
                    const cardBorder = getStyleClass(
                      nurse.ward,
                      nurse.level,
                      true,
                    ).replace("bg-", "l-border-");
                    return (
                      <div
                        key={nurse.id}
                        className={`db-dnd-doctor-card ${cardBorder}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, nurse.id)}
                        onClick={() => setSelectedNurse(nurse)}
                      >
                        <div className="db-dnd-doc-name">
                          <UserCheck size={16} />{" "}
                          {nurse.name.replace("RN. ", "")}
                        </div>
                        <div className="db-dnd-doc-spec">
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span className="db-badge-level">
                              {nurse.level}
                            </span>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: "bold",
                                color: "#64748b",
                              }}
                            >
                              {nurse.ward}
                            </span>
                          </div>
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              opacity: 0.8,
                              marginTop: "4px",
                            }}
                          >
                            <Clock size={14} /> Max {nurse.maxHours}h / Shift
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {filteredNurses.length === 0 && (
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#94a3b8",
                        textAlign: "center",
                        marginTop: "20px",
                      }}
                    >
                      No nurses available.
                    </div>
                  )}
                </div>
              </div>

              {/* Grid Calendar Area */}
              <div className="db-mc-wrapper">
                {/* Days of week header */}
                <div className="db-mc-grid-header">
                  {daysOfWeek.map((d) => (
                    <div key={d} className="db-mc-header-col">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Days grid body */}
                <div className="db-mc-grid-body">
                  {monthDays.map((day) => {
                    const isToday = day === currentDay;

                    return (
                      <div
                        key={day}
                        className={`db-mc-cell ${isToday ? "today" : ""}`}
                      >
                        <div className={`db-mc-date ${isToday ? "today" : ""}`}>
                          {day}
                        </div>

                        <div className="db-mc-events">
                          {shiftRequirements
                            .filter(
                              (req) =>
                                req.day === day &&
                                (selectedWard === "All" ||
                                  req.ward === selectedWard),
                            )
                            .map((req) => {
                              const isFilled = req.filledBy !== null;
                              const assignedNurse = isFilled
                                ? nursesList.find((n) => n.id === req.filledBy)
                                : null;
                              const blockClass = getStyleClass(
                                req.ward,
                                req.reqLevel,
                                isFilled,
                              );

                              return (
                                <div
                                  key={req.id}
                                  className={`db-mc-pill ${blockClass}`}
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => handleDrop(e, req.id)}
                                  onClick={(e) => {
                                    if (isFilled) {
                                      e.stopPropagation();
                                      setSelectedNurse(assignedNurse);
                                    }
                                  }}
                                  title={
                                    isFilled
                                      ? `${assignedNurse.name} (${req.startHour}:00, ${req.duration}h)`
                                      : `${req.ward} | Req: ${req.reqLevel} | ${req.reqShift} (${req.duration}h)`
                                  }
                                >
                                  {isFilled ? (
                                    <>
                                      <div className="db-mc-pill-title">
                                        {assignedNurse.name.replace("RN. ", "")}
                                      </div>
                                      <div className="db-mc-pill-desc">
                                        {req.startHour}:00 ({req.duration}h)
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div
                                        className="db-mc-pill-title"
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                        }}
                                      >
                                        <ShieldAlert size={12} /> Require{" "}
                                        {req.ward}
                                      </div>
                                      <div className="db-mc-pill-desc">
                                        {req.reqLevel} • {req.reqShift}
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
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
                <h3>Weather Trigger</h3>
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
                <h3>Local Events & Impact</h3>
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
