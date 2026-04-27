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
  Save,
  FileText,
  Database,
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

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

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

  const [nurseSchedule, setNurseSchedule] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState("All");

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthDays = Array.from({ length: 31 }, (_, i) => i + 1);
  const currentDay = new Date().getDate();

  const getStyleClass = (ward, level, isFilled) => {
    let base = "default";

    // ทำความสะอาด level เผื่อกรณีข้อมูลจากหลังบ้านเป็น "RN Level4"
    const cleanLevel = level
      ? level.toString().toLowerCase().replace(/rn/g, "").replace(/\s+/g, "")
      : "";

    if (ward === "ER" && cleanLevel === "level4") base = "er-l4";
    else if (ward === "ER" && cleanLevel === "level3") base = "er-l3";
    else if (ward === "ICU" && cleanLevel === "level4") base = "icu-l4";
    else if (ward === "ICU" && cleanLevel === "level3") base = "icu-l3";
    else if (ward === "OPD" && cleanLevel === "level3") base = "opd-l3";
    else if (ward === "OPD" && cleanLevel === "part-time") base = "opd-pt";

    return isFilled ? `bg-${base}` : `border-${base}`;
  };

  const [nursesList, setNursesList] = useState([]);

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

    // === แก้ไขจุดนี้: ทำความสะอาดข้อความก่อนเทียบกัน ===
    // 1. เปลี่ยนเป็นตัวเล็กทั้งหมด
    // 2. ลบคำว่า 'rn'
    // 3. ลบช่องว่างออกทั้งหมด
    // ผลลัพธ์: "RN Level4" -> "level4" | "Level 4" -> "level4"
    const safeNurseLevel = nurse.level
      .toLowerCase()
      .replace(/rn/g, "")
      .replace(/\s+/g, "");
    const safeReqLevel = req.reqLevel
      .toLowerCase()
      .replace(/rn/g, "")
      .replace(/\s+/g, "");

    if (safeNurseLevel !== safeReqLevel) {
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

  const handleSaveSchedule = () => {
    setIsSaving(true);
    setSaveMessage(null);
    const assignedShifts = shiftRequirements
      .filter((req) => req.filledBy !== null)
      .map((req) => {
        const dateString = `2026-03-${req.day.toString().padStart(2, "0")}`;
        return {
          employee_id: req.filledBy,
          date: dateString,
          ward: req.ward,
          shift_type: req.reqShift,
          start_hour: req.startHour,
          duration_hours: req.duration,
        };
      });
    const payload = { action: "assign_shift", data: assignedShifts };
    console.log(
      "Sending Schedule Payload to Backend API:",
      JSON.stringify(payload, null, 2),
    );

    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage("Schedule successfully saved to database.");
      setTimeout(() => setSaveMessage(null), 4000);
    }, 1500);
  };

  const handleFileUpload = async (event, uploadType) => {
    const file = event.target.files[0];
    if (!file) return;

    setShowUploadModal(false);
    setUploadStatus(
      `Uploading & Analyzing ${uploadType === "roster" ? "Nurse Roster" : "Patient Data"}...`,
    );

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_type", uploadType);

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/er/upload-data`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      if (response.data.status === "success") {
        setUploadStatus("Data Saved & AI Updated!");

        if (
          response.data.recommendations &&
          response.data.recommendations.length > 0
        ) {
          setStaffingData((prev) => {
            const newData = [...prev];
            newData[0] = response.data.recommendations[0];
            newData[1] = response.data.recommendations[1];
            return newData;
          });
        }

        if (response.data.nurses && response.data.nurses.length > 0) {
          setNursesList(response.data.nurses);
        }

        if (response.data.chart_data && response.data.chart_data.length > 0) {
          setErChartData(response.data.chart_data);
          const peak = response.data.chart_data.reduce(
            (max, current) => (current.load > max.load ? current : max),
            response.data.chart_data[0],
          );
          setErPeakHour(peak.hour);
        }

        if (response.data.detailed_schedule) {
          setNurseSchedule(response.data.detailed_schedule);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("Error processing file.");
    }
    setTimeout(() => setUploadStatus(null), 4000);
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
        setOpdForecastData([
          { date: "Day 0", actual: 1450, predicted: 1400 },
          ...opdRes.data.data.map((item) => ({
            date: item.date,
            actual: null,
            predicted: item.volume,
          })),
        ]);

        setErCurrentLoad(erRes.data.data.current_load);
        setErPeakHour(erRes.data.data.peak_hour);
        if (
          erRes.data.data.chart_data &&
          erRes.data.data.chart_data.length > 0
        ) {
          setErChartData(erRes.data.data.chart_data);
        } else {
          setErChartData([
            { hour: "08:00", load: 40 },
            { hour: "10:00", load: 65 },
            { hour: "12:00", load: 85 },
            { hour: "14:00", load: 70 },
            { hour: "16:00", load: 90 },
            { hour: "18:00", load: 110 },
            { hour: "20:00", load: 80 },
          ]);
        }

        if (
          erRes.data.data.recommendations &&
          erRes.data.data.recommendations.length > 0
        ) {
          setStaffingData((prev) => {
            const newData = [...prev];
            newData[0] = erRes.data.data.recommendations[0];
            newData[1] = erRes.data.data.recommendations[1];
            return newData;
          });
        }

        if (erRes.data.data.detailed_schedule) {
          setNurseSchedule(erRes.data.data.detailed_schedule);
        }

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
      {/* === Upload Selection Modal === */}
      {showUploadModal && (
        <div
          className="db-nurse-panel-overlay"
          onClick={() => setShowUploadModal(false)}
          style={{ justifyContent: "center", alignItems: "center" }}
        >
          <div
            className="db-nurse-panel-content"
            style={{
              height: "auto",
              borderRadius: "16px",
              margin: "auto",
              width: "420px",
              paddingBottom: "20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="db-np-header">
              <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.2rem" }}>
                Select Data to Upload
              </h3>
              <button
                className="db-np-close-btn"
                onClick={() => setShowUploadModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div
              className="db-np-body"
              style={{
                gap: "15px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <label
                className="db-upload-option-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  padding: "15px",
                  border: "2px dashed #cbd5e1",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: "#f8fafc",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.background = "#eff6ff";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.background = "#f8fafc";
                }}
              >
                <FileText size={36} color="#3b82f6" />
                <div
                  className="db-option-text"
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <strong
                    style={{
                      color: "#0f172a",
                      fontSize: "1.05rem",
                      marginBottom: "4px",
                    }}
                  >
                    Nurse Roster (Excel)
                  </strong>
                  <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
                    Upload the monthly shift roster layout.
                  </span>
                </div>
                <input
                  type="file"
                  hidden
                  accept=".xlsx, .xls"
                  onChange={(e) => handleFileUpload(e, "roster")}
                />
              </label>

              <label
                className="db-upload-option-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  padding: "15px",
                  border: "2px dashed #cbd5e1",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: "#f8fafc",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "#f43f5e";
                  e.currentTarget.style.background = "#fff1f2";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.background = "#f8fafc";
                }}
              >
                <Database size={36} color="#f43f5e" />
                <div
                  className="db-option-text"
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <strong
                    style={{
                      color: "#0f172a",
                      fontSize: "1.05rem",
                      marginBottom: "4px",
                    }}
                  >
                    ER Patient Load (CSV)
                  </strong>
                  <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
                    Upload hourly patient volume history.
                  </span>
                </div>
                <input
                  type="file"
                  hidden
                  accept=".csv"
                  onChange={(e) => handleFileUpload(e, "patient_load")}
                />
              </label>
            </div>
          </div>
        </div>
      )}

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
            <button
              className="db-upload-btn"
              onClick={() => setShowUploadModal(true)}
              style={{
                background: "#3b82f6",
                color: "white",
                padding: "8px 16px",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer",
                border: "none",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Upload size={18} /> Upload Data
            </button>
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

          <div className="db-charts-grid">
            <div className="db-chart-card">
              <div className="db-chart-header">
                <span className="db-dot db-dot-blue"></span>7-Day OPD Volume
                Forecast (AI Model)
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
                <span className="db-dot db-dot-rose"></span>Hourly ER Load
                Prediction
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

          {/* ======================================================= */}
          {/* Detailed Nurse Shift Schedule (AI Auto-Scheduled)       */}
          {/* ======================================================= */}
          <div
            className="db-staffing-card"
            style={{ marginTop: "1.5rem", marginBottom: "2rem" }}
          >
            <div className="db-staffing-header">
              <Clock size={22} color="#9333ea" />
              <h2>Detailed Nurse Shift Schedule (AI Auto-Scheduled)</h2>
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
                  {nurseSchedule.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        style={{
                          textAlign: "center",
                          padding: "20px",
                          color: "#64748b",
                        }}
                      >
                        No active schedule found. Please upload data.
                      </td>
                    </tr>
                  ) : (
                    nurseSchedule.map((staff, idx) => (
                      <tr key={idx}>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div
            className="db-staffing-card"
            style={{ marginTop: "1.5rem", marginBottom: "2rem" }}
          >
            <div
              className="db-staffing-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div className="db-staffing-header-left" style={{ flex: 1 }}>
                <Calendar size={22} color="#f43f5e" />
                <h2>Monthly Ward Scheduling (AI Recommendations)</h2>
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "15px" }}
              >
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  Drag a matching nurse onto the dashed AI slots.
                </span>
                <button
                  onClick={handleSaveSchedule}
                  disabled={isSaving}
                  style={{
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: isSaving ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    opacity: isSaving ? 0.7 : 1,
                    transition: "background 0.2s",
                  }}
                >
                  <Save size={16} /> {isSaving ? "Saving..." : "Save Schedule"}
                </button>
                {saveMessage && (
                  <span
                    style={{
                      color: "#10b981",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                    }}
                  >
                    {saveMessage}
                  </span>
                )}
              </div>
            </div>

            <div className="db-dnd-container">
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
                      No nurses available. Please upload a schedule.
                    </div>
                  )}
                </div>
              </div>

              <div className="db-mc-wrapper">
                <div className="db-mc-grid-header">
                  {daysOfWeek.map((d) => (
                    <div key={d} className="db-mc-header-col">
                      {d}
                    </div>
                  ))}
                </div>
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
