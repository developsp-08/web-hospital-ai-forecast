import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Activity,
  Calendar,
  MapPin,
  Upload,
  Clock,
  Sun,
  Moon,
  UserCheck,
  X,
  Info,
  Save,
  FileText,
  BrainCircuit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Database,
} from "lucide-react";

import "./style/Dashboard.css";

export default function Dashboard() {
  const [uploadStatus, setUploadStatus] = useState(null);
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [staffingData, setStaffingData] = useState([]);
  const [nurseSchedule, setNurseSchedule] = useState([]); // Used for Target Quotas
  const [llmExplanation, setLlmExplanation] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState("ER");

  // 🌟 เพิ่ม State กลับคืนมาสำหรับเก็บข้อมูล Hourly Chart
  const [erChartData, setErChartData] = useState([]);

  // === Dynamic Next Month Logic ===
  const today = new Date();
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthName = nextMonthDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const daysInNextMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 2,
    0,
  ).getDate();

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthDays = Array.from({ length: daysInNextMonth }, (_, i) => i + 1);

  const getStyleClass = (ward, level) => {
    let base = "default";
    const cleanLevel = level
      ? level
          .toString()
          .toLowerCase()
          .replace(/rn/g, "")
          .replace(/\s+/g, "")
          .replace(/-/g, "")
      : "";

    if (ward === "ER" && cleanLevel === "level4") base = "er-l4";
    else if (ward === "ER" && cleanLevel === "level3") base = "er-l3";
    else if (ward === "ER" && cleanLevel === "level1") base = "er-l3";
    else if (ward === "ER" && cleanLevel === "parttime") base = "opd-pt";

    return `bg-${base}`;
  };

  const [nursesList, setNursesList] = useState([]);

  // Isolated states: Actual user actions vs AI Suggestions
  const [assignedShifts, setAssignedShifts] = useState([]);
  const [aiDrafts, setAiDrafts] = useState([]);

  const handleDragStart = (e, nurseId, sourceAssignId = null) => {
    e.dataTransfer.setData("nurseId", nurseId);
    if (sourceAssignId)
      e.dataTransfer.setData("sourceAssignId", sourceAssignId);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDropToExisting = (e, targetAssignId) => {
    e.preventDefault();
    e.stopPropagation();
    const nurseId = e.dataTransfer.getData("nurseId");
    if (!nurseId) return;

    setAssignedShifts((prev) => {
      let newAssignments = [...prev];
      const targetIdx = newAssignments.findIndex(
        (a) => a.id === targetAssignId,
      );
      if (targetIdx > -1) {
        newAssignments[targetIdx].filledBy = nurseId;
      }
      return newAssignments;
    });
  };

  const handleDropToShift = (e, day, shiftType) => {
    e.preventDefault();
    e.stopPropagation();
    const nurseId = e.dataTransfer.getData("nurseId");
    const sourceAssignId = e.dataTransfer.getData("sourceAssignId");
    if (!nurseId) return;

    setAssignedShifts((prev) => {
      let newAssignments = [...prev];
      if (sourceAssignId) {
        newAssignments = newAssignments.filter((a) => a.id !== sourceAssignId);
      }

      newAssignments.push({
        id: `assign-${Date.now()}-${Math.random()}`,
        day: day,
        ward: selectedWard,
        startHour: shiftType === "Day" ? 8 : 16,
        duration: 8,
        reqShift: shiftType,
        filledBy: nurseId,
        isUserAssigned: true, // This is manually placed, not a draft anymore
      });
      return newAssignments;
    });
  };

  // === Trash Zone Drop Logic ===
  const handleDropToTrash = (e) => {
    e.preventDefault();
    const sourceAssignId = e.dataTransfer.getData("sourceAssignId");
    if (sourceAssignId) {
      setAssignedShifts((prev) => prev.filter((a) => a.id !== sourceAssignId));
    }
  };

  const filteredNurses = nursesList.filter(
    (n) => selectedWard === "All" || n.ward === selectedWard,
  );

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    const payloadData = assignedShifts.map((req) => {
      const mm = String(nextMonthDate.getMonth() + 1).padStart(2, "0");
      const yy = nextMonthDate.getFullYear();
      return {
        employee_id: req.filledBy,
        date: `${yy}-${mm}-${req.day.toString().padStart(2, "0")}`,
        ward: req.ward,
        shift_type: req.reqShift,
        start_hour: req.startHour,
        duration_hours: req.duration,
      };
    });

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/er/save-schedule`,
        { action: "assign_shift", data: payloadData },
      );

      if (response.data.status === "success") {
        setSaveMessage("Successfully saved to database!");
      } else {
        setSaveMessage("Error saving to database.");
      }
    } catch (error) {
      console.error("Save error:", error);
      setSaveMessage("Connection Failed.");
    }

    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage(null);
    }, 4000);
  };

  const handleFileUpload = async (event, uploadType) => {
    const file = event.target.files[0];
    if (!file) return;

    setShowUploadModal(false);
    setUploadStatus(`Uploading & Processing Data...`);

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
        setUploadStatus(`Data Saved!`);
        if (response.data.recommendations)
          setStaffingData(response.data.recommendations);
        if (response.data.nurses) setNursesList(response.data.nurses);
        if (response.data.detailed_schedule)
          setNurseSchedule(response.data.detailed_schedule);
        if (response.data.saved_shifts)
          setAssignedShifts(response.data.saved_shifts);
        if (response.data.ai_draft) setAiDrafts(response.data.ai_draft);
        if (response.data.llm_explanation)
          setLlmExplanation(response.data.llm_explanation);
        if (response.data.chart_data) setErChartData(response.data.chart_data);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("Error processing file.");
    }
    setTimeout(() => setUploadStatus(null), 4000);
  };

  useEffect(() => {
    const API_BASE_URL =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

    const fetchDashboardData = async () => {
      try {
        const erRes = await axios.get(`${API_BASE_URL}/api/v1/er/forecast`);

        if (erRes.data.data.recommendations)
          setStaffingData(erRes.data.data.recommendations);
        if (erRes.data.data.detailed_schedule)
          setNurseSchedule(erRes.data.data.detailed_schedule);
        if (erRes.data.data.nurses) setNursesList(erRes.data.data.nurses);
        if (erRes.data.data.saved_shifts)
          setAssignedShifts(erRes.data.data.saved_shifts);
        if (erRes.data.data.ai_draft) setAiDrafts(erRes.data.data.ai_draft);
        if (erRes.data.data.llm_explanation)
          setLlmExplanation(erRes.data.data.llm_explanation);
        if (erRes.data.data.chart_data)
          setErChartData(erRes.data.data.chart_data);

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // 🌟 Logic to calculate if shift is fulfilled based ONLY on manual assignments
  const getShiftStatus = (day, shiftType) => {
    const slots = nurseSchedule.filter(
      (s) => s.day === day && s.shiftType === shiftType,
    );
    const l4Needed = slots.filter((s) => s.reqLevel.includes("4")).length;
    const l3Needed = slots.filter((s) => !s.reqLevel.includes("4")).length;

    // Fulfillment checks ONLY the `assignedShifts` (which is user-driven)
    const assignedCount = assignedShifts.filter(
      (a) => a.day === day && a.reqShift === shiftType,
    ).length;
    const missing = slots.length - assignedCount;

    return { l4Needed, l3Needed, missing };
  };

  // 🌟 [REAL DATA] Calculate Daily Staffing Levels Chart from actual assignments
  const chartData = useMemo(() => {
    const dailyData = {};
    for (let i = 1; i <= daysInNextMonth; i++) {
      dailyData[i] = { day: `${i}`, dayStaff: 0, nightStaff: 0 };
    }
    assignedShifts.forEach((shift) => {
      if (shift.reqShift === "Day") dailyData[shift.day].dayStaff += 1;
      if (shift.reqShift === "Night") dailyData[shift.day].nightStaff += 1;
    });
    return Object.values(dailyData);
  }, [assignedShifts, daysInNextMonth]);

  const criticalDay = useMemo(() => {
    if (chartData.length === 0) return "N/A";
    const dayWithMinStaff = chartData.reduce((min, current) => {
      const totalMin = min.dayStaff + min.nightStaff;
      const totalCurrent = current.dayStaff + current.nightStaff;
      return totalCurrent < totalMin ? current : min;
    }, chartData[0]);
    return `Day ${dayWithMinStaff.day}`;
  }, [chartData]);

  return (
    <div className="db-container">
      {/* 🌟 Floating Trash Zone */}
      <div
        style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          width: "80px",
          height: "80px",
          background: "#fee2e2",
          border: "2px dashed #ef4444",
          borderRadius: "50%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#ef4444",
          zIndex: 1000,
          fontSize: "0.65rem",
          fontWeight: "bold",
          cursor: "pointer",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}
        onDragOver={handleDragOver}
        onDrop={handleDropToTrash}
        title="Drop here to remove assignment"
      >
        <Trash2 size={24} style={{ marginBottom: "4px" }} />
        Remove
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          className="db-nurse-panel-overlay"
          onClick={() => setShowUploadModal(false)}
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
                  background: "#f8fafc",
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
            </div>
          </div>
        </div>
      )}

      {/* Staff Profile Modal */}
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

              {/* 🌟 Display Monthly History from Actual Database */}
              <div style={{ marginTop: "20px", marginBottom: "20px" }}>
                <h4
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "10px",
                    color: "#1e293b",
                    fontSize: "1rem",
                  }}
                >
                  <Database size={18} color="#64748b" /> Workload History
                </h4>
                <div
                  style={{
                    maxHeight: "180px",
                    overflowY: "auto",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.85rem",
                    }}
                  >
                    <thead
                      style={{
                        background: "#f8fafc",
                        position: "sticky",
                        top: 0,
                      }}
                    >
                      <tr>
                        <th
                          style={{
                            padding: "8px 12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e2e8f0",
                            color: "#64748b",
                          }}
                        >
                          Month / Year
                        </th>
                        <th
                          style={{
                            padding: "8px 12px",
                            textAlign: "right",
                            borderBottom: "1px solid #e2e8f0",
                            color: "#64748b",
                          }}
                        >
                          Total Hours
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedNurse.workHistory &&
                      selectedNurse.workHistory.length > 0 ? (
                        selectedNurse.workHistory.map((hist, idx) => (
                          <tr
                            key={idx}
                            style={{ borderBottom: "1px solid #f1f5f9" }}
                          >
                            <td
                              style={{ padding: "8px 12px", color: "#334155" }}
                            >
                              {hist.label}
                            </td>
                            <td
                              style={{
                                padding: "8px 12px",
                                textAlign: "right",
                                fontWeight: "bold",
                                color: "#0f172a",
                              }}
                            >
                              {hist.hours} h
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="2"
                            style={{
                              padding: "16px",
                              textAlign: "center",
                              color: "#94a3b8",
                            }}
                          >
                            No database records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary for Current Placed Draft */}
                <div
                  style={{
                    marginTop: "10px",
                    padding: "12px",
                    background: "#eff6ff",
                    borderRadius: "8px",
                    border: "1px dashed #3b82f6",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "#1e40af",
                      fontWeight: "600",
                    }}
                  >
                    Current Plan ({nextMonthName.split(" ")[0]})
                  </span>
                  <span style={{ fontWeight: "bold", color: "#1d4ed8" }}>
                    {assignedShifts
                      .filter((s) => s.filledBy === selectedNurse.id)
                      .reduce((a, c) => a + c.duration, 0)}{" "}
                    h
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
          <h1>Hospital ER Forecasting ({nextMonthName})</h1>
          <p>Predictive Scheduling & Rostering System</p>
        </div>
        <div className="db-location-box">
          <div className="db-upload-section">
            {uploadStatus && (
              <span
                className="db-upload-status"
                style={{
                  background: "#f59e0b",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "4px",
                }}
              >
                {uploadStatus}
              </span>
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
            <MapPin size={16} className="db-map-icon" /> Ban Khlong Suan, Samut
            Prakan
          </div>
        </div>
      </header>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>
          <h2>Connecting to Neon DB & AI Backend...</h2>
        </div>
      ) : (
        <>
          {/* Real Data Metrics */}
          <div className="db-metrics-grid">
            <div className="db-card db-card-blue">
              <div className="db-card-title">
                <Users size={20} color="#2563eb" /> Total ER Nurses
              </div>
              <div className="db-card-value">
                {nursesList.length}{" "}
                <span
                  className="db-trend-up"
                  style={{ color: "#64748b", background: "transparent" }}
                >
                  Active Staff
                </span>
              </div>
            </div>
            <div className="db-card db-card-purple">
              <div className="db-card-title">
                <Calendar size={20} color="#9333ea" /> Total Shift Slots
              </div>
              <div className="db-card-value">
                {nurseSchedule.length}{" "}
                <span
                  className="db-trend-up"
                  style={{ color: "#64748b", background: "transparent" }}
                >
                  Target Size
                </span>
              </div>
            </div>
            <div className="db-card db-card-orange">
              <div className="db-card-title">
                <UserCheck size={20} color="#ea580c" /> Filled Shifts
              </div>
              <div className="db-card-value db-value-orange">
                {assignedShifts.length}{" "}
                <span
                  className="db-trend-up"
                  style={{ color: "#64748b", background: "transparent" }}
                >
                  Completed
                </span>
              </div>
            </div>
            <div className="db-card db-card-rose">
              <div className="db-card-title">
                <Activity size={20} color="#e11d48" /> Critical Shortage
              </div>
              <div className="db-card-value db-value-rose">
                {criticalDay}{" "}
                <span
                  className="db-er-peak-text"
                  style={{ marginLeft: "10px" }}
                >
                  Needs Staff
                </span>
              </div>
            </div>
          </div>

          {/* AI Reasoning Box */}
          {llmExplanation && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "1.5rem",
                display: "flex",
                gap: "15px",
              }}
            >
              <BrainCircuit
                size={32}
                color="#10b981"
                style={{ flexShrink: 0 }}
              />
              <div
                style={{ color: "#166534" }}
                dangerouslySetInnerHTML={{ __html: llmExplanation }}
              ></div>
            </div>
          )}

          {/* 🌟 2-Column Charts Grid */}
          <div
            className="db-charts-grid"
            style={{ gridTemplateColumns: "1fr 1fr", gap: "20px" }}
          >
            {/* Chart 1: Hourly ER Load */}
            <div className="db-chart-card">
              <div className="db-chart-header">
                <span className="db-dot db-dot-rose"></span>Hourly ER Load
                Prediction
              </div>
              <div className="db-chart-wrapper" style={{ minHeight: "300px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={erChartData}
                    margin={{ top: 5, right: 0, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorLoad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
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
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(226, 232, 240, 0.4)" }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Bar
                      dataKey="load"
                      name="ER Patient Count"
                      fill="url(#colorLoad)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Scheduled Staffing */}
            <div className="db-chart-card">
              <div className="db-chart-header">
                <span className="db-dot db-dot-blue"></span>Daily Scheduled
                Staffing Levels ({nextMonthName})
              </div>
              <div className="db-chart-wrapper" style={{ minHeight: "300px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 0, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorDay" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                      <linearGradient
                        id="colorNight"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#4338ca" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#cbd5e1"
                    />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis
                      domain={[0, "dataMax + 2"]}
                      allowDecimals={false}
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
                    <Bar
                      dataKey="dayStaff"
                      stackId="a"
                      name="Day Shift Staff"
                      fill="url(#colorDay)"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="nightStaff"
                      stackId="a"
                      name="Night Shift Staff"
                      fill="url(#colorNight)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
                <h2>Monthly ER Scheduling (Manual Drop Zone)</h2>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "15px" }}
              >
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  AI Suggestions are guidelines only. Drag staff to fulfill
                  shifts.
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
                      color: saveMessage.includes("Error")
                        ? "#ef4444"
                        : "#10b981",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {saveMessage.includes("Error") ? (
                      <AlertCircle size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}{" "}
                    {saveMessage}
                  </span>
                )}
              </div>
            </div>

            <div className="db-dnd-container">
              {/* Sidebar Nurses */}
              <div className="db-dnd-sidebar">
                <div className="db-dnd-sidebar-title">Available Nurses</div>
                <div className="db-dnd-nurse-list">
                  {filteredNurses.map((nurse) => {
                    const dynamicallyAddedHours = assignedShifts
                      .filter((s) => s.filledBy === nurse.id)
                      .reduce((acc, curr) => acc + curr.duration, 0);
                    const cardBorder = getStyleClass(
                      nurse.ward,
                      nurse.level,
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
                          <UserCheck size={16} /> {nurse.name}
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
                              color:
                                dynamicallyAddedHours > 160
                                  ? "#ef4444"
                                  : "inherit",
                            }}
                          >
                            <Clock size={14} /> Plan: {dynamicallyAddedHours}h
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Main Calendar Matrix */}
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
                    // Logic to retrieve targeted logic for the shift boxes
                    const dayStatus = getShiftStatus(day, "Day");
                    const nightStatus = getShiftStatus(day, "Night");

                    return (
                      <div
                        key={day}
                        className="db-mc-cell"
                        style={{ paddingBottom: "10px" }}
                      >
                        <div className="db-mc-date">{day}</div>
                        <div className="db-mc-events">
                          {/* ======================= DAY SHIFT ======================= */}
                          <div
                            style={{
                              marginBottom: "8px",
                              padding: "6px",
                              background:
                                dayStatus.missing > 0 ? "#fff1f2" : "#f0fdf4",
                              border:
                                dayStatus.missing > 0
                                  ? "1px solid #fecdd3"
                                  : "1px solid #bbf7d0",
                              borderRadius: "6px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: "bold",
                                color:
                                  dayStatus.missing > 0 ? "#e11d48" : "#166534",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <Sun size={12} /> Day Shift
                              </span>
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "2px",
                                }}
                              >
                                {dayStatus.missing > 0 ? (
                                  <>
                                    <AlertCircle size={12} /> Missing{" "}
                                    {dayStatus.missing}
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={12} /> Fulfilled
                                  </>
                                )}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: "0.65rem",
                                color: "#64748b",
                                marginTop: "4px",
                                display: "flex",
                                gap: "4px",
                                alignItems: "center",
                              }}
                            >
                              <strong style={{ color: "#334155" }}>
                                Target:
                              </strong>
                              {dayStatus.l4Needed > 0 && (
                                <span
                                  style={{
                                    background: "#eff6ff",
                                    color: "#1d4ed8",
                                    padding: "2px 4px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  L4 x{dayStatus.l4Needed}
                                </span>
                              )}
                              {dayStatus.l3Needed > 0 && (
                                <span
                                  style={{
                                    background: "#f0fdf4",
                                    color: "#15803d",
                                    padding: "2px 4px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  L3/L1 x{dayStatus.l3Needed}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 🌟 AI Static Hints (Un-draggable) */}
                          {aiDrafts
                            .filter(
                              (d) => d.day === day && d.reqShift === "Day",
                            )
                            .map((draft) => {
                              const hintNurse = nursesList.find(
                                (nl) => nl.id === draft.filledBy,
                              );
                              if (!hintNurse) return null;
                              return (
                                <div
                                  key={draft.id}
                                  style={{
                                    padding: "6px",
                                    marginBottom: "4px",
                                    border: "1px dashed #cbd5e1",
                                    borderRadius: "6px",
                                    fontSize: "0.65rem",
                                    color: "#64748b",
                                    background: "rgba(248, 250, 252, 0.6)",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    userSelect: "none",
                                    pointerEvents: "none", // Ensures this cannot be interacted with
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    <Lightbulb size={12} color="#fbbf24" />{" "}
                                    {hintNurse.name}
                                  </span>
                                  <span
                                    style={{
                                      fontWeight: "bold",
                                      color: "#94a3b8",
                                    }}
                                  >
                                    {hintNurse.level}
                                  </span>
                                </div>
                              );
                            })}

                          {/* User Active Drop Zone (Day) */}
                          <div
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropToShift(e, day, "Day")}
                            style={{ minHeight: "40px" }}
                          >
                            {assignedShifts
                              .filter(
                                (req) =>
                                  req.day === day && req.reqShift === "Day",
                              )
                              .map((req) => {
                                const assignedNurse = nursesList.find(
                                  (n) => n.id === req.filledBy,
                                );
                                if (!assignedNurse) return null;
                                return (
                                  <div
                                    key={req.id}
                                    className={`db-mc-pill ${getStyleClass(req.ward, assignedNurse.level)}`}
                                    draggable={true}
                                    onDragStart={(e) =>
                                      handleDragStart(
                                        e,
                                        assignedNurse.id,
                                        req.id,
                                      )
                                    }
                                    onDragOver={handleDragOver}
                                    onDrop={(e) =>
                                      handleDropToExisting(e, req.id)
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedNurse(assignedNurse);
                                    }}
                                    title={`${assignedNurse.name} (${req.startHour}:00, ${req.duration}h)`}
                                  >
                                    <div className="db-mc-pill-title">
                                      {assignedNurse.name}
                                    </div>
                                    <div className="db-mc-pill-desc">
                                      {req.startHour}:00 ({req.duration}h)
                                    </div>
                                  </div>
                                );
                              })}
                            <div
                              style={{
                                width: "100%",
                                marginTop: "8px",
                                marginBottom: "12px",
                                border: "1px dashed #cbd5e1",
                                borderRadius: "6px",
                                padding: "6px",
                                fontSize: "0.7rem",
                                textAlign: "center",
                                color: "#94a3b8",
                                cursor: "pointer",
                                background: "#f8fafc",
                              }}
                            >
                              + Drop Nurse to Day
                            </div>
                          </div>

                          <hr
                            style={{
                              border: "none",
                              borderTop: "1px dotted #cbd5e1",
                              margin: "8px 0",
                            }}
                          />

                          {/* ======================= NIGHT SHIFT ======================= */}
                          <div
                            style={{
                              marginBottom: "8px",
                              padding: "6px",
                              background:
                                nightStatus.missing > 0 ? "#fff1f2" : "#f0fdf4",
                              border:
                                nightStatus.missing > 0
                                  ? "1px solid #fecdd3"
                                  : "1px solid #bbf7d0",
                              borderRadius: "6px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: "bold",
                                color:
                                  nightStatus.missing > 0
                                    ? "#e11d48"
                                    : "#166534",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <Moon size={12} /> Night Shift
                              </span>
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "2px",
                                }}
                              >
                                {nightStatus.missing > 0 ? (
                                  <>
                                    <AlertCircle size={12} /> Missing{" "}
                                    {nightStatus.missing}
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={12} /> Fulfilled
                                  </>
                                )}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: "0.65rem",
                                color: "#64748b",
                                marginTop: "4px",
                                display: "flex",
                                gap: "4px",
                                alignItems: "center",
                              }}
                            >
                              <strong style={{ color: "#334155" }}>
                                Target:
                              </strong>
                              {nightStatus.l4Needed > 0 && (
                                <span
                                  style={{
                                    background: "#eff6ff",
                                    color: "#1d4ed8",
                                    padding: "2px 4px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  L4 x{nightStatus.l4Needed}
                                </span>
                              )}
                              {nightStatus.l3Needed > 0 && (
                                <span
                                  style={{
                                    background: "#f0fdf4",
                                    color: "#15803d",
                                    padding: "2px 4px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  L3/L1 x{nightStatus.l3Needed}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 🌟 AI Static Hints (Un-draggable) */}
                          {aiDrafts
                            .filter(
                              (d) => d.day === day && d.reqShift === "Night",
                            )
                            .map((draft) => {
                              const hintNurse = nursesList.find(
                                (nl) => nl.id === draft.filledBy,
                              );
                              if (!hintNurse) return null;
                              return (
                                <div
                                  key={draft.id}
                                  style={{
                                    padding: "6px",
                                    marginBottom: "4px",
                                    border: "1px dashed #cbd5e1",
                                    borderRadius: "6px",
                                    fontSize: "0.65rem",
                                    color: "#64748b",
                                    background: "rgba(248, 250, 252, 0.6)",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    userSelect: "none",
                                    pointerEvents: "none",
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    <Lightbulb size={12} color="#818cf8" />{" "}
                                    {hintNurse.name}
                                  </span>
                                  <span
                                    style={{
                                      fontWeight: "bold",
                                      color: "#94a3b8",
                                    }}
                                  >
                                    {hintNurse.level}
                                  </span>
                                </div>
                              );
                            })}

                          {/* User Active Drop Zone (Night) */}
                          <div
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropToShift(e, day, "Night")}
                            style={{ minHeight: "40px" }}
                          >
                            {assignedShifts
                              .filter(
                                (req) =>
                                  req.day === day && req.reqShift === "Night",
                              )
                              .map((req) => {
                                const assignedNurse = nursesList.find(
                                  (n) => n.id === req.filledBy,
                                );
                                if (!assignedNurse) return null;
                                return (
                                  <div
                                    key={req.id}
                                    className={`db-mc-pill ${getStyleClass(req.ward, assignedNurse.level)}`}
                                    draggable={true}
                                    onDragStart={(e) =>
                                      handleDragStart(
                                        e,
                                        assignedNurse.id,
                                        req.id,
                                      )
                                    }
                                    onDragOver={handleDragOver}
                                    onDrop={(e) =>
                                      handleDropToExisting(e, req.id)
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedNurse(assignedNurse);
                                    }}
                                    title={`${assignedNurse.name} (${req.startHour}:00, ${req.duration}h)`}
                                  >
                                    <div className="db-mc-pill-title">
                                      {assignedNurse.name}
                                    </div>
                                    <div className="db-mc-pill-desc">
                                      {req.startHour}:00 ({req.duration}h)
                                    </div>
                                  </div>
                                );
                              })}
                            <div
                              style={{
                                width: "100%",
                                marginTop: "8px",
                                border: "1px dashed #cbd5e1",
                                borderRadius: "6px",
                                padding: "6px",
                                fontSize: "0.7rem",
                                textAlign: "center",
                                color: "#94a3b8",
                                cursor: "pointer",
                                background: "#f8fafc",
                              }}
                            >
                              + Drop Nurse to Night
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Final Summary Table */}
          <div
            className="db-staffing-card"
            style={{ marginTop: "1.5rem", marginBottom: "2rem" }}
          >
            <div className="db-staffing-header">
              <Clock size={22} color="#9333ea" />
              <h2>Detailed Confirmed Schedule ({nextMonthName})</h2>
            </div>
            <div
              className="db-table-responsive"
              style={{ maxHeight: "400px", overflowY: "auto" }}
            >
              <table className="db-staffing-table">
                <thead>
                  <tr
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "#f8fafc",
                      zIndex: 10,
                    }}
                  >
                    <th>Date</th>
                    <th>Nurse Name</th>
                    <th>Ward</th>
                    <th>Shift Type</th>
                    <th>Time (Start - End)</th>
                    <th>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedShifts.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        style={{
                          textAlign: "center",
                          padding: "20px",
                          color: "#64748b",
                        }}
                      >
                        Please drag nurses into the calendar above to build the
                        schedule.
                      </td>
                    </tr>
                  ) : (
                    assignedShifts
                      .sort((a, b) => a.day - b.day)
                      .map((staff, idx) => {
                        const nurseInfo = nursesList.find(
                          (n) => n.id === staff.filledBy,
                        );
                        if (!nurseInfo) return null;
                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600, color: "#0f172a" }}>
                              {nextMonthName.split(" ")[0].substring(0, 3)}{" "}
                              {staff.day}
                            </td>
                            <td className="td-bold">
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <UserCheck size={16} color="#475569" />
                                {nurseInfo.name}
                              </div>
                            </td>
                            <td>{staff.ward}</td>
                            <td>
                              {staff.reqShift === "Day" ? (
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
                              {staff.startHour}:00 -{" "}
                              {staff.startHour === 8 ? "16:00" : "00:00"}
                            </td>
                            <td>
                              <strong
                                style={{ fontSize: "1.1rem", color: "#0f172a" }}
                              >
                                {staff.duration}
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
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
