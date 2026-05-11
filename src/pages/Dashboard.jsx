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
  LineChart,
  Line,
  Area,
  ComposedChart,
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
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Play,
  ShieldAlert,
  ChevronDown,
  ChevronUp, // 🌟 เพิ่ม Icon สำหรับปุ่ม Collapse
  ToggleRight,
  Plus,
} from "lucide-react";

import "./style/Dashboard.css";

export default function Dashboard() {
  const [uploadStatus, setUploadStatus] = useState(null);
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [staffingData, setStaffingData] = useState([]);
  const [nurseSchedule, setNurseSchedule] = useState([]);
  const [llmExplanation, setLlmExplanation] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState("ER");
  const [erChartData, setErChartData] = useState([]);

  // 🌟 เพิ่ม State ควบคุมการ ย่อ/ขยาย 2 สัปดาห์
  const [isExpandedView, setIsExpandedView] = useState(false);

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

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const monthDays = Array.from({ length: daysInNextMonth }, (_, i) => i + 1);

  // 🌟 คำนวณวันที่จะนำมาโชว์ (ถ้าไม่ Expand ให้โชว์แค่ 14 วัน)
  const displayedDays = isExpandedView ? monthDays : monthDays.slice(0, 14);

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
    else if (ward === "ER" && cleanLevel === "level1") base = "er-l1";
    else if (ward === "ER" && cleanLevel === "parttime") base = "opd-pt";
    return `bg-${base}`;
  };

  const [nursesList, setNursesList] = useState([]);
  const [assignedShifts, setAssignedShifts] = useState([]);
  const [aiDrafts, setAiDrafts] = useState([]);

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
        newAssignments[targetIdx].isUserAssigned = true;
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
      if (sourceAssignId)
        newAssignments = newAssignments.filter((a) => a.id !== sourceAssignId);
      newAssignments.push({
        id: `assign-${Date.now()}-${Math.random()}`,
        day,
        ward: selectedWard,
        startHour: shiftType === "Day" ? 8 : 16,
        duration: 8,
        reqShift: shiftType,
        filledBy: nurseId,
        isUserAssigned: true,
      });
      return newAssignments;
    });
  };

  const handleDropToTrash = (e) => {
    e.preventDefault();
    const sourceAssignId = e.dataTransfer.getData("sourceAssignId");
    if (sourceAssignId)
      setAssignedShifts((prev) => prev.filter((a) => a.id !== sourceAssignId));
  };

  const filteredNurses = nursesList.filter(
    (n) =>
      (selectedWard === "All" || n.ward === selectedWard) &&
      (n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.level.toLowerCase().includes(searchQuery.toLowerCase())),
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
    if (payloadData.length === 0) {
      alert("Please drag and assign at least one nurse before saving.");
      setIsSaving(false);
      return;
    }

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/er/save-schedule`,
        { action: "assign_shift", data: payloadData },
      );
      if (response.data.status === "success")
        setSaveMessage("Successfully saved to database!");
      else setSaveMessage("Error saving to database.");
    } catch {
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
    } catch {
      setUploadStatus("Error processing file.");
    }
    setTimeout(() => setUploadStatus(null), 4000);
  };

  const getShiftStatus = (day, shiftType) => {
    const slots = nurseSchedule.filter(
      (s) => s.day === day && s.shiftType === shiftType,
    );
    const target = slots.length;
    const l4Needed = slots.filter((s) => s.reqLevel.includes("4")).length;
    const l3Needed = slots.filter((s) => !s.reqLevel.includes("4")).length;
    const assignedCount = assignedShifts.filter(
      (a) => a.day === day && a.reqShift === shiftType,
    ).length;
    const missing = target - assignedCount;
    return { target, assignedCount, missing, l4Needed, l3Needed };
  };

  const chartData = useMemo(() => {
    const dailyData = {};
    for (let i = 1; i <= daysInNextMonth; i++)
      dailyData[i] = { day: `${i}`, dayStaff: 0, nightStaff: 0 };
    assignedShifts.forEach((shift) => {
      if (shift.reqShift === "Day") dailyData[shift.day].dayStaff += 1;
      if (shift.reqShift === "Night") dailyData[shift.day].nightStaff += 1;
    });
    return Object.values(dailyData);
  }, [assignedShifts, daysInNextMonth]);

  const shortageDaysCount = useMemo(() => {
    let count = 0;
    for (let i = 1; i <= daysInNextMonth; i++) {
      const dStat = getShiftStatus(i, "Day");
      const nStat = getShiftStatus(i, "Night");
      if (dStat.missing > 0 || nStat.missing > 0) count++;
    }
    return count;
  }, [assignedShifts, daysInNextMonth, nurseSchedule]);

  const fillPercentage = useMemo(() => {
    if (nurseSchedule.length === 0) return 0;
    return Math.round((assignedShifts.length / nurseSchedule.length) * 100);
  }, [assignedShifts, nurseSchedule]);

  return (
    <div className="s-container">
      {/* 🌟 Floating Trash Zone */}
      <div
        className="s-trash-zone"
        onDragOver={handleDragOver}
        onDrop={handleDropToTrash}
        title="Drop here to remove assignment"
      >
        <Trash2 size={24} style={{ marginBottom: "2px" }} />
        <span>Trash</span>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          className="s-modal-overlay"
          onClick={() => setShowUploadModal(false)}
        >
          <div className="s-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="s-modal-header">
              <h3>Import Data</h3>
              <button onClick={() => setShowUploadModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="s-modal-body">
              <label className="s-upload-card">
                <FileText size={36} className="text-blue" />
                <div className="s-upload-text">
                  <strong>Nurse Roster (Excel)</strong>
                  <span>Upload the monthly shift roster layout.</span>
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
        <div className="s-modal-overlay" onClick={() => setSelectedNurse(null)}>
          <div className="s-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="s-modal-header">
              <div className="flex-center gap-2">
                <Info size={20} className="text-blue" />
                <h3>Staff Profile</h3>
              </div>
              <button onClick={() => setSelectedNurse(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="s-modal-body">
              <div className="s-profile-hero">
                <div className="s-avatar-large">
                  {selectedNurse.name.charAt(0)}
                </div>
                <h2>{selectedNurse.name}</h2>
                <div className="s-badges">
                  <span className="s-badge-role">{selectedNurse.level}</span>
                  <span className="s-badge-ward">{selectedNurse.ward}</span>
                </div>
              </div>

              <div className="s-history-section">
                <h4>
                  <Database size={16} /> Workload History
                </h4>
                <div className="s-history-table-wrap">
                  <table className="s-history-table">
                    <thead>
                      <tr>
                        <th>Month / Year</th>
                        <th className="text-right">Total Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedNurse.workHistory &&
                      selectedNurse.workHistory.length > 0 ? (
                        selectedNurse.workHistory.map((hist, idx) => (
                          <tr key={idx}>
                            <td>{hist.label}</td>
                            <td className="text-right bold">{hist.hours} h</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="2" className="text-center text-muted">
                            No records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="s-current-plan">
                  <span>Current Plan ({nextMonthName.split(" ")[0]})</span>
                  <span className="bold text-blue">
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

      {/* === TOP HEADER (SaaS Style) === */}
      <header className="s-header">
        <div className="s-header-left">
          <h1>Hospital ER Forecasting & Scheduling</h1>
          <p>Predictive staffing and schedule optimization</p>
        </div>
        <div className="s-header-right">
          <div className="s-header-dropdown">
            <MapPin size={16} className="text-blue" />
            <div className="flex-col">
              <span className="bold text-dark text-sm">General Hospital</span>
              <span className="text-muted text-xs">ER Department</span>
            </div>
            <ChevronDown size={14} className="text-muted ml-2" />
          </div>
          <button
            className="s-btn-outline"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload size={16} /> Import
          </button>
          <button className="s-btn-primary">
            <Play size={16} fill="currentColor" /> Run Forecast
          </button>
          <button
            className="s-btn-success"
            onClick={handleSaveSchedule}
            disabled={isSaving}
          >
            <Save size={16} /> {isSaving ? "Saving..." : "Save Schedule"}
          </button>
        </div>
      </header>

      {uploadStatus && <div className="s-toast-success">{uploadStatus}</div>}
      {saveMessage && (
        <div
          className={`s-toast ${saveMessage.includes("Error") ? "error" : "success"}`}
        >
          {saveMessage}
        </div>
      )}

      {isLoading ? (
        <div className="s-loading">
          <h2>Initializing Workspace...</h2>
        </div>
      ) : (
        <>
          {/* === METRICS CARDS === */}
          <div className="s-metrics-grid">
            <div className="s-metric-card">
              <div className="s-metric-icon bg-blue-light text-blue">
                <Users size={28} />
              </div>
              <div className="s-metric-content">
                <span className="s-metric-title">Total Nurses</span>
                <span className="s-metric-value">{nursesList.length}</span>
                <span className="s-metric-sub">Active Staff</span>
              </div>
            </div>
            <div className="s-metric-card">
              <div className="s-metric-icon bg-purple-light text-purple">
                <Calendar size={28} />
              </div>
              <div className="s-metric-content">
                <span className="s-metric-title">Total Shift Slots</span>
                <span className="s-metric-value">{nurseSchedule.length}</span>
                <span className="s-metric-sub">Target Slots</span>
              </div>
            </div>
            <div className="s-metric-card">
              <div className="s-metric-icon bg-green-light text-green">
                <CheckCircle2 size={28} />
              </div>
              <div className="s-metric-content">
                <span className="s-metric-title">Filled Shifts</span>
                <span className="s-metric-value">{assignedShifts.length}</span>
                <span className="s-metric-sub">{fillPercentage}% Filled</span>
              </div>
            </div>
            <div className="s-metric-card">
              <div className="s-metric-icon bg-red-light text-red">
                <AlertCircle size={28} />
              </div>
              <div className="s-metric-content">
                <span className="s-metric-title">Critical Shortage Days</span>
                <span className="s-metric-value">{shortageDaysCount}</span>
                <span className="s-metric-sub text-red">Needs Attention</span>
              </div>
            </div>
          </div>

          {/* === AI RECOMMENDATIONS BANNER === */}
          {llmExplanation && (
            <div className="s-ai-banner">
              <div className="s-ai-bg-brain">
                <BrainCircuit size={180} strokeWidth={1} />
              </div>

              <div className="s-ai-header-row">
                <div className="s-ai-title-section">
                  <div className="s-ai-icon-wrapper">
                    <UserCheck size={20} />
                  </div>
                  <div className="flex-col">
                    <span className="s-ai-main-title">AI Recommendations</span>
                    <span className="s-ai-sub-title">
                      Forecast-driven insights and staffing suggestions
                    </span>
                  </div>
                </div>

                <div className="s-ai-stats-row">
                  <div className="s-ai-stat-box">
                    <span className="s-ai-stat-val text-teal">
                      {shortageDaysCount}
                    </span>
                    <div className="flex-col">
                      <span className="s-ai-stat-label">
                        Days with High Shortage Risk
                      </span>
                      <span className="s-ai-stat-desc">Review schedule</span>
                    </div>
                  </div>
                  <div className="s-ai-stat-box">
                    <span className="s-ai-stat-val text-orange">
                      +{aiDrafts.length}
                    </span>
                    <div className="flex-col">
                      <span className="s-ai-stat-label">
                        Recommended Shifts
                      </span>
                      <span className="s-ai-stat-desc">Across the month</span>
                    </div>
                  </div>
                  <div className="s-ai-stat-box">
                    <span className="s-ai-stat-val text-blue">92%</span>
                    <div className="flex-col">
                      <span className="s-ai-stat-label">
                        Forecast Confidence
                      </span>
                      <span className="s-ai-stat-desc">High confidence</span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="s-ai-content-row"
                dangerouslySetInnerHTML={{ __html: llmExplanation }}
              ></div>
            </div>
          )}

          {/* === CHARTS GRID === */}
          <div className="s-charts-grid">
            <div className="s-panel">
              <div className="s-panel-header">
                <div className="flex-center gap-2">
                  <BarChart size={18} className="text-muted" />{" "}
                  <h3 className="s-panel-title">
                    Hourly ER Load Forecast{" "}
                    <span className="text-muted font-normal">
                      ({nextMonthName})
                    </span>
                  </h3>
                </div>
              </div>
              <div className="s-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={erChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="hour"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      dx={-10}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar
                      dataKey="load"
                      name="Patients"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="s-panel">
              <div className="s-panel-header">
                <div className="flex-center gap-2">
                  <Activity size={18} className="text-muted" />{" "}
                  <h3 className="s-panel-title">
                    Daily Staffing Levels{" "}
                    <span className="text-muted font-normal">
                      ({nextMonthName})
                    </span>
                  </h3>
                </div>
              </div>
              <div className="s-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      dx={-10}
                      domain={[0, "dataMax + 2"]}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="target"
                      fill="#f1f5f9"
                      stroke="none"
                    />
                    <Line
                      type="monotone"
                      dataKey="dayStaff"
                      name="Day Staff"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="nightStaff"
                      name="Night Staff"
                      stroke="#0d9488"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      strokeDasharray="5 5"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* === SCHEDULING BOARD === */}
          <div className="s-panel mb-8">
            <div className="s-board-header">
              <div className="flex-center gap-4">
                <h2 className="s-board-title">
                  {nextMonthName} - ER Staffing Schedule
                </h2>
                <div className="s-pagination">
                  <button>
                    <ChevronLeft size={16} />
                  </button>
                  <span className="bold text-sm">Today</span>
                  <button>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-center gap-3">
                <div className="s-filter-btn">
                  Month <ChevronDown size={14} />
                </div>
                <div className="s-filter-btn">
                  <SlidersHorizontal size={14} /> Filters
                </div>
                <div className="flex-center gap-2 ml-2">
                  <span className="bold text-sm text-dark">Show Shortage</span>
                  <ToggleRight size={24} className="text-teal" />
                </div>
              </div>
            </div>

            <div className="s-board-container">
              {/* SIDEBAR: NURSE ROSTER */}
              <div className="s-sidebar">
                <div className="s-sidebar-header">
                  <span className="bold text-dark text-sm">Nurse Roster</span>
                  <div className="s-search-box">
                    <Search size={14} className="text-muted" />
                    <input
                      type="text"
                      placeholder="Search nurses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="s-nurse-list">
                  {filteredNurses.map((nurse) => {
                    const planHours = assignedShifts
                      .filter((s) => s.filledBy === nurse.id)
                      .reduce((acc, curr) => acc + curr.duration, 0);
                    return (
                      <div
                        key={nurse.id}
                        className="s-nurse-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, nurse.id)}
                        onClick={() => setSelectedNurse(nurse)}
                      >
                        <div className="s-nurse-avatar">
                          {nurse.name.charAt(0)}
                        </div>
                        <div className="s-nurse-info">
                          <span className="s-nurse-name">{nurse.name}</span>
                          <span className="s-nurse-role">{nurse.level}</span>
                        </div>
                        <div className="s-nurse-hours">
                          {planHours > 160 ? (
                            <AlertCircle size={14} className="text-red" />
                          ) : null}
                          <span
                            className={
                              planHours > 160 ? "text-red bold" : "text-muted"
                            }
                          >
                            {planHours}h
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <button className="s-add-nurse-btn">
                    <Plus size={14} /> Add Nurse
                  </button>
                </div>
              </div>

              {/* MAIN CALENDAR GRID */}
              <div className="s-grid-wrapper">
                <div className="s-grid-header">
                  {daysOfWeek.map((d) => (
                    <div key={d} className="s-grid-header-col">
                      {d}
                    </div>
                  ))}
                </div>

                {/* 🌟 แสดงผลเฉพาะวันที่กำหนด (14 วัน หรือ ทั้งเดือน) */}
                <div className="s-grid-body">
                  {displayedDays.map((day) => {
                    const dStat = getShiftStatus(day, "Day");
                    const nStat = getShiftStatus(day, "Night");

                    const dateObj = new Date(
                      nextMonthDate.getFullYear(),
                      nextMonthDate.getMonth(),
                      day,
                    );
                    const isWeekend =
                      dateObj.getDay() === 0 || dateObj.getDay() === 6;

                    return (
                      <div
                        key={day}
                        className={`s-cell ${isWeekend ? "weekend" : ""}`}
                      >
                        <div className="s-cell-date">{day}</div>

                        {/* DAY SHIFT */}
                        <div className="s-shift-section">
                          <div
                            className={`s-shift-header ${dStat.missing > 0 ? "shortage" : "fulfilled"}`}
                            title={`Need L4:${dStat.l4Needed}, L3:${dStat.l3Needed}`}
                          >
                            <span className="s-shift-name">Day Shift</span>
                            <div className="flex-center gap-1">
                              <span className="s-shift-count">
                                {dStat.assignedCount}/{dStat.target}
                              </span>
                              {dStat.missing > 0 && (
                                <AlertCircle size={12} className="text-red" />
                              )}
                            </div>
                          </div>

                          {/* AI Hints */}
                          {aiDrafts
                            .filter(
                              (d) => d.day === day && d.reqShift === "Day",
                            )
                            .map((draft) => {
                              const n = nursesList.find(
                                (nl) => nl.id === draft.filledBy,
                              );
                              if (!n) return null;
                              return (
                                <div key={draft.id} className="s-pill ghost">
                                  {n.name}
                                </div>
                              );
                            })}

                          {/* Dropped Nurses */}
                          <div
                            className="s-drop-zone"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropToShift(e, day, "Day")}
                          >
                            {assignedShifts
                              .filter(
                                (req) =>
                                  req.day === day && req.reqShift === "Day",
                              )
                              .map((req) => {
                                const n = nursesList.find(
                                  (nx) => nx.id === req.filledBy,
                                );
                                if (!n) return null;
                                return (
                                  <div
                                    key={req.id}
                                    className={`s-pill ${getStyleClass("ER", n.level)} ${!req.isUserAssigned ? "ghost" : ""}`}
                                    draggable
                                    onDragStart={(e) =>
                                      handleDragStart(e, n.id, req.id)
                                    }
                                    onDragOver={handleDragOver}
                                    onDrop={(e) =>
                                      handleDropToExisting(e, req.id)
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedNurse(n);
                                    }}
                                  >
                                    {n.name}
                                  </div>
                                );
                              })}
                            <div className="s-drop-placeholder">
                              + Drop to Day
                            </div>
                          </div>
                        </div>

                        {/* NIGHT SHIFT */}
                        <div className="s-shift-section mt-1">
                          <div
                            className={`s-shift-header ${nStat.missing > 0 ? "shortage" : "night-fulfilled"}`}
                            title={`Need L4:${nStat.l4Needed}, L3:${nStat.l3Needed}`}
                          >
                            <span className="s-shift-name">Night Shift</span>
                            <div className="flex-center gap-1">
                              <span className="s-shift-count">
                                {nStat.assignedCount}/{nStat.target}
                              </span>
                              {nStat.missing > 0 && (
                                <AlertCircle size={12} className="text-red" />
                              )}
                            </div>
                          </div>

                          {/* AI Hints */}
                          {aiDrafts
                            .filter(
                              (d) => d.day === day && d.reqShift === "Night",
                            )
                            .map((draft) => {
                              const n = nursesList.find(
                                (nl) => nl.id === draft.filledBy,
                              );
                              if (!n) return null;
                              return (
                                <div key={draft.id} className="s-pill ghost">
                                  {n.name}
                                </div>
                              );
                            })}

                          {/* Dropped Nurses */}
                          <div
                            className="s-drop-zone"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropToShift(e, day, "Night")}
                          >
                            {assignedShifts
                              .filter(
                                (req) =>
                                  req.day === day && req.reqShift === "Night",
                              )
                              .map((req) => {
                                const n = nursesList.find(
                                  (nx) => nx.id === req.filledBy,
                                );
                                if (!n) return null;
                                return (
                                  <div
                                    key={req.id}
                                    className={`s-pill ${getStyleClass("ER", n.level)} ${!req.isUserAssigned ? "ghost" : ""}`}
                                    draggable
                                    onDragStart={(e) =>
                                      handleDragStart(e, n.id, req.id)
                                    }
                                    onDragOver={handleDragOver}
                                    onDrop={(e) =>
                                      handleDropToExisting(e, req.id)
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedNurse(n);
                                    }}
                                  >
                                    {n.name}
                                  </div>
                                );
                              })}
                            <div className="s-drop-placeholder">
                              + Drop to Night
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 🌟 ปุ่ม Toggle ขยาย/ย่อ ปฏิทิน */}
                <div className="s-expand-wrapper">
                  <button
                    className="s-expand-btn"
                    onClick={() => setIsExpandedView(!isExpandedView)}
                  >
                    {isExpandedView ? (
                      <>
                        <ChevronUp size={16} /> Collapse to 2 Weeks
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} /> Expand Full Month
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* === BOTTOM TABLE === */}
          <div className="s-panel mb-8">
            <div className="s-panel-header">
              <div className="flex-center gap-2">
                <Calendar size={18} className="text-blue" />{" "}
                <h3 className="s-panel-title">
                  Confirmed Schedule (Next 7 Days)
                </h3>
              </div>
              <span className="text-blue text-sm cursor-pointer hover-underline bold">
                View Full Schedule &gt;
              </span>
            </div>
            <div className="s-table-wrap">
              <table className="s-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Shift</th>
                    <th>Nurse</th>
                    <th>Role</th>
                    <th>Shift Time</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedShifts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-muted">
                        No schedule confirmed yet.
                      </td>
                    </tr>
                  ) : (
                    assignedShifts
                      .sort((a, b) => a.day - b.day)
                      .slice(0, 10)
                      .map((staff, idx) => {
                        const n = nursesList.find(
                          (x) => x.id === staff.filledBy,
                        );
                        if (!n) return null;
                        return (
                          <tr key={idx}>
                            <td className="text-dark font-medium">
                              {nextMonthName.split(" ")[0]} {staff.day},{" "}
                              {nextMonthDate.getFullYear()}
                            </td>
                            <td>
                              <span
                                className={`s-shift-badge ${staff.reqShift.toLowerCase()}`}
                              >
                                {staff.reqShift} Shift
                              </span>
                            </td>
                            <td className="text-dark font-medium">{n.name}</td>
                            <td className="text-muted">{n.level}</td>
                            <td className="text-muted">
                              {staff.startHour === 8
                                ? "08:00 - 16:00"
                                : "16:00 - 00:00"}
                            </td>
                            <td className="text-dark">{staff.duration}</td>
                            <td>
                              <span className="s-status-badge confirmed">
                                Confirmed <CheckCircle2 size={12} />
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
