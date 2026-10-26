import {
  HeartPulse, LayoutDashboard, Users, Stethoscope, CalendarDays,
  BrainCircuit, Settings, Bell, Search, Clock3, CheckCircle2,
  CircleAlert, ArrowUpRight, Menu, LogOut, RefreshCw, Check, X, Filter,
} from "lucide-react";
import "./AdminDashboard.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import PatientsPage from "./PatientsPage";
import DoctorsPage from "./DoctorsPage";

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function getPatientStatus(status) {
  const labels = {
    Waiting: "Chờ khám",
    "Under Treatment": "Đang điều trị",
    Discharged: "Đã xuất viện",
  };
  return labels[status] || status || "Chưa cập nhật";
}

function AdminDashboard() {
  const [activePage, setActivePage] = useState("overview");
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState("all");
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState("");

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    setOverviewError("");
    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) throw new Error("Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại.");

      const headers = { Authorization: `Bearer ${token}` };
      const [patientsResponse, doctorsResponse, appointmentsResponse] = await Promise.all([
        fetch("/api/patients", { headers }),
        fetch("/api/doctors", { headers }),
        fetch("/api/appointments", { headers }),
      ]);

      const patientsResult = await patientsResponse.json().catch(() => ({}));
      const doctorsResult = await doctorsResponse.json().catch(() => ({}));
      const appointmentsResult = await appointmentsResponse.json().catch(() => ([]));

      if (!patientsResponse.ok) {
        throw new Error(patientsResult.detail || `Không tải được bệnh nhân (HTTP ${patientsResponse.status}).`);
      }
      if (!doctorsResponse.ok) {
        throw new Error(doctorsResult.detail || `Không tải được bác sĩ (HTTP ${doctorsResponse.status}).`);
      }
      if (!appointmentsResponse.ok) throw new Error(appointmentsResult.detail || `Không tải được lịch khám (HTTP ${appointmentsResponse.status}).`);
      if (!Array.isArray(patientsResult) || !Array.isArray(doctorsResult) || !Array.isArray(appointmentsResult)) {
        throw new Error("Dữ liệu thống kê trả về không đúng định dạng.");
      }

      setPatients(patientsResult);
      setDoctors(doctorsResult);
      setAppointments(appointmentsResult);
    } catch (err) {
      setOverviewError(err.message || "Không thể tải số liệu tổng quan.");
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    setAppointmentsError("");
    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) throw new Error("Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại.");
      const response = await fetch("/api/appointments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => ([]));
      if (!response.ok) throw new Error(result.detail || `Không tải được lịch khám (HTTP ${response.status}).`);
      if (!Array.isArray(result)) throw new Error("Dữ liệu lịch khám trả về không đúng định dạng.");
      setAppointments(result);
    } catch (err) {
      setAppointmentsError(err.message || "Không thể tải lịch khám.");
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  const updateAppointmentStatus = useCallback(async (appointment, status) => {
    const id = appointment.id ?? appointment.appointment_id;
    if (id == null) {
      setAppointmentsError("Không tìm thấy mã lịch khám.");
      return;
    }
    setUpdatingAppointmentId(id);
    setAppointmentsError("");
    try {
      const token = sessionStorage.getItem("access_token");
      const response = await fetch(`/api/appointments/${id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || `Không cập nhật được lịch khám (HTTP ${response.status}).`);
      await loadAppointments();
    } catch (err) {
      setAppointmentsError(err.message || "Không thể cập nhật trạng thái lịch khám.");
    } finally {
      setUpdatingAppointmentId(null);
    }
  }, [loadAppointments]);

  useEffect(() => {
    if (activePage === "overview") loadOverview();
    if (activePage === "appointments") loadAppointments();
  }, [activePage, loadOverview, loadAppointments]);

  const activeDoctors = useMemo(
    () => doctors.filter((doctor) => doctor.is_active === true || doctor.is_active === 1).length,
    [doctors],
  );
  const recentPatients = useMemo(
    () => [...patients].sort((a, b) => Number(b.id || 0) - Number(a.id || 0)).slice(0, 5),
    [patients],
  );
  const todayISO = new Date().toLocaleDateString("en-CA");
  const todayAppointments = appointments.filter((item) => String(item.appointment_date || item.date || "").slice(0, 10) === todayISO).length;
  const pendingAppointments = appointments.filter((item) => String(item.status || "").toLowerCase() === "pending").length;
  const filteredAppointments = appointments.filter((item) => {
    const patient = item.patient_name || item.full_name || item.patient?.full_name || "";
    const doctor = item.doctor_name || item.doctor?.full_name || "";
    const query = appointmentSearch.trim().toLocaleLowerCase("vi");
    const matchesSearch = !query || `${patient} ${doctor} ${item.reason || ""} ${item.id ?? item.appointment_id ?? ""}`.toLocaleLowerCase("vi").includes(query);
    const matchesStatus = appointmentStatusFilter === "all" || String(item.status || "").toLowerCase() === appointmentStatusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });
  const statusLabels = { pending: "Chờ xác nhận", confirmed: "Đã xác nhận", completed: "Đã hoàn thành", rejected: "Đã từ chối", cancelled: "Đã hủy" };
  const statusClass = { pending: "pending", confirmed: "confirmed", completed: "confirmed", rejected: "cancelled", cancelled: "cancelled" };
  const todayLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  }).format(new Date());

  const statistics = [
    { title: "Tổng bệnh nhân", value: patients.length, subtitle: "Hồ sơ hiện có trong hệ thống", icon: Users, type: "teal" },
    { title: "Lịch khám hôm nay", value: todayAppointments, subtitle: "Lịch hẹn theo ngày hiện tại", icon: CalendarDays, type: "blue" },
    { title: "Bác sĩ đang hoạt động", value: activeDoctors, subtitle: `Trên tổng số ${doctors.length} hồ sơ bác sĩ`, icon: Stethoscope, type: "purple" },
    { title: "Lịch chờ xác nhận", value: pendingAppointments, subtitle: "Đang chờ xử lý", icon: Clock3, type: "orange" },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon"><HeartPulse size={25} /></div>
          <div><strong>Patient Portal</strong><span>HOSPITAL SYSTEM</span></div>
        </div>
        <div className="sidebar-label">MENU CHÍNH</div>
        <nav className="admin-nav">
          <button type="button" className={`admin-nav-link ${activePage === "overview" ? "active" : ""}`} onClick={() => setActivePage("overview")}><LayoutDashboard size={19} /><span>Tổng quan</span></button>
          <button type="button" className={`admin-nav-link ${activePage === "patients" ? "active" : ""}`} onClick={() => setActivePage("patients")}><Users size={19} /><span>Bệnh nhân</span></button>
          <button type="button" className={`admin-nav-link ${activePage === "doctors" ? "active" : ""}`} onClick={() => setActivePage("doctors")}><Stethoscope size={19} /><span>Bác sĩ</span></button>
          <button type="button" className="admin-nav-link" onClick={() => setActivePage("appointments")}><CalendarDays size={19} /><span>Lịch khám</span></button>
          <button type="button" className="admin-nav-link" onClick={() => setActivePage("ai-triage")}><BrainCircuit size={19} /><span>AI Triage</span><span className="nav-tag">AI</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-label">HỆ THỐNG</div>
          <button type="button" className="admin-nav-link" onClick={() => setActivePage("settings")}><Settings size={19} /><span>Cài đặt</span></button>
          <button type="button" className="admin-nav-link logout-button" onClick={() => { sessionStorage.removeItem("access_token"); window.location.reload(); }}><LogOut size={19} /><span>Đăng xuất</span></button>
          <div className="admin-profile"><div className="profile-avatar">AD</div><div className="profile-info"><strong>Administrator</strong><span>Quản trị viên</span></div><Settings size={17} /></div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <button className="mobile-menu" aria-label="Mở menu"><Menu size={22} /></button>
          <div className="header-search"><Search size={18} /><input placeholder="Tìm kiếm bệnh nhân, bác sĩ..." /><kbd>Ctrl K</kbd></div>
          <div className="header-actions"><button className="notification-button" aria-label="Thông báo"><Bell size={20} /></button><div className="header-divider" /><div className="header-user"><div className="profile-avatar">AD</div><div><strong>Administrator</strong><span>Quản trị viên</span></div></div></div>
        </header>

        <div className="admin-content">
          {activePage === "patients" ? <PatientsPage /> :
           activePage === "doctors" ? <DoctorsPage /> :
           activePage === "appointments" ? (
             <section className="panel" style={{ padding: 24 }}>
               <div className="panel-heading">
                 <div><h2>Lịch khám toàn bệnh viện</h2><p>Quản lý và theo dõi lịch hẹn của bệnh nhân</p></div>
                 <button className="date-button" onClick={loadAppointments} disabled={loadingAppointments}><RefreshCw size={16} /> {loadingAppointments ? "Đang tải..." : "Làm mới"}</button>
               </div>
               <div className="stats-grid" style={{ margin: "18px 0" }}>
                 {[["Tổng lịch hẹn", appointments.length], ["Chờ xác nhận", pendingAppointments], ["Đã xác nhận", appointments.filter(a => String(a.status).toLowerCase() === "confirmed").length], ["Đã hoàn thành", appointments.filter(a => String(a.status).toLowerCase() === "completed").length]].map(([label, value]) => <article className="stat-card" key={label}><div className="stat-title">{label}</div><div className="stat-value">{value}</div></article>)}
               </div>
               <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
                 <label style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 260px", border: "1px solid #dbe3ee", borderRadius: 8, padding: "10px 12px" }}><Search size={17} /><input aria-label="Tìm lịch khám" value={appointmentSearch} onChange={e => setAppointmentSearch(e.target.value)} placeholder="Tìm bệnh nhân, bác sĩ, lý do hoặc mã lịch..." style={{ border: 0, outline: 0, width: "100%" }} /></label>
                 <label style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #dbe3ee", borderRadius: 8, padding: "8px 12px" }}><Filter size={17} /><select aria-label="Lọc trạng thái" value={appointmentStatusFilter} onChange={e => setAppointmentStatusFilter(e.target.value)} style={{ border: 0, outline: 0, background: "transparent" }}><option value="all">Tất cả trạng thái</option><option value="pending">Chờ xác nhận</option><option value="confirmed">Đã xác nhận</option><option value="completed">Đã hoàn thành</option><option value="rejected">Đã từ chối</option><option value="cancelled">Đã hủy</option></select></label>
               </div>
               {appointmentsError && <div className="doctors-error" role="alert">{appointmentsError}</div>}
               {loadingAppointments ? <div className="doctors-empty">Đang tải lịch khám...</div> : filteredAppointments.length === 0 ? <div className="doctors-empty">Không tìm thấy lịch khám phù hợp.</div> : (
                 <div className="table-scroll"><table className="appointment-table"><thead><tr><th>MÃ LỊCH</th><th>BỆNH NHÂN</th><th>BÁC SĨ</th><th>NGÀY / GIỜ</th><th>LÝ DO KHÁM</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead>
                   <tbody>{filteredAppointments.map((item) => {
                     const id = item.id ?? item.appointment_id;
                     const status = String(item.status || "pending").toLowerCase();
                     const dateValue = item.appointment_date || item.date;
                     const timeValue = item.appointment_time || item.time;
                     const patientName = item.patient_name || item.full_name || item.patient?.full_name || (item.patient_id ? `BN #${item.patient_id}` : "Chưa cập nhật");
                     const doctorName = item.doctor_name || item.doctor?.full_name || (item.doctor_id ? `BS #${item.doctor_id}` : "Chưa phân công");
                     return <tr key={id}>
                       <td><strong>#{id ?? "—"}</strong></td>
                       <td><div className="doctor-cell"><strong>{patientName}</strong><span>{item.patient_code || item.patient?.patient_code || ""}</span></div></td>
                       <td>{doctorName}</td>
                       <td><div className="doctor-cell"><strong>{formatDate(dateValue)}</strong><span>{timeValue ? String(timeValue).slice(0, 5) : "Chưa cập nhật"}</span></div></td>
                       <td>{item.reason || item.notes || "Không có mô tả"}</td>
                       <td><span className={`status-badge ${statusClass[status] || "pending"}`}>{statusLabels[status] || item.status || "Chưa cập nhật"}</span></td>
                       <td><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                         {status === "pending" && <><button type="button" className="date-button" disabled={updatingAppointmentId === id} onClick={() => updateAppointmentStatus(item, "Confirmed")} title="Xác nhận"><Check size={14} /> Xác nhận</button><button type="button" className="date-button" disabled={updatingAppointmentId === id} onClick={() => updateAppointmentStatus(item, "Rejected")} title="Từ chối"><X size={14} /> Từ chối</button></>}
                         {status === "confirmed" && <button type="button" className="date-button" disabled={updatingAppointmentId === id} onClick={() => updateAppointmentStatus(item, "Cancelled")}>Hủy lịch</button>}
                         {updatingAppointmentId === id && <small>Đang cập nhật...</small>}
                       </div></td>
                     </tr>;
                   })}</tbody></table></div>
               )}
             </section>
           ) : activePage !== "overview" ? (
             <section className="panel" style={{ padding: 24 }}>
               <h2>{activePage === "ai-triage" ? "AI Triage" : "Cài đặt"}</h2>
               <p className="welcome-description">Trang này chưa được kết nối dữ liệu trong phiên bản hiện tại.</p>
               <button className="date-button" onClick={() => setActivePage("overview")}>Quay lại tổng quan</button>
             </section>
           ) : (
            <>
              <section className="welcome-row">
                <div>
                  <p className="dashboard-eyebrow">TỔNG QUAN HỆ THỐNG</p>
                  <h1>Dashboard</h1>
                  <p className="welcome-description">Số liệu lấy trực tiếp từ cơ sở dữ liệu hiện tại. {todayLabel}.</p>
                </div>
                <button className="date-button" onClick={loadOverview} disabled={loadingOverview}><RefreshCw size={16} /> {loadingOverview ? "Đang tải..." : "Làm mới"}</button>
              </section>

              {overviewError && <div className="doctors-error" role="alert">{overviewError} <button onClick={loadOverview}>Thử lại</button></div>}

              <section className="stats-grid">
                {statistics.map((item) => {
                  const Icon = item.icon;
                  return <article className="stat-card" key={item.title}>
                    <div className={`stat-icon ${item.type}`}><Icon size={22} /></div>
                    <div className="stat-title">{item.title}</div>
                    <div className="stat-value">{loadingOverview ? "…" : item.value.toLocaleString?.("vi-VN") ?? item.value}</div>
                    <div className={`stat-change ${item.type}`}>
                      {item.type === "orange" ? <CircleAlert size={15} /> : <ArrowUpRight size={15} />}
                      {item.subtitle}
                    </div>
                  </article>;
                })}
              </section>

              <section className="dashboard-panels">
                <article className="panel appointment-panel">
                  <div className="panel-heading">
                    <div><h2>Bệnh nhân mới được thêm</h2><p>5 hồ sơ gần đây trong cơ sở dữ liệu</p></div>
                    <button type="button" className="view-all" onClick={() => setActivePage("patients")}>Xem bệnh nhân <ArrowUpRight size={16} /></button>
                  </div>
                  {loadingOverview ? <div className="doctors-empty">Đang tải dữ liệu...</div> : recentPatients.length === 0 ? (
                    <div className="doctors-empty">Chưa có hồ sơ bệnh nhân trong cơ sở dữ liệu.</div>
                  ) : (
                    <div className="table-scroll">
                      <table className="appointment-table">
                        <thead><tr><th>MÃ BỆNH NHÂN</th><th>HỌ VÀ TÊN</th><th>LIÊN HỆ</th><th>TRẠNG THÁI HỒ SƠ</th></tr></thead>
                        <tbody>{recentPatients.map((patient) => (
                          <tr key={patient.id}>
                            <td><strong>{patient.patient_code || `ID-${patient.id}`}</strong></td>
                            <td><div className="doctor-cell"><strong>{patient.full_name || "Chưa cập nhật"}</strong><span>{patient.gender || "Chưa cập nhật"} · {patient.date_of_birth ? formatDate(patient.date_of_birth) : "Chưa có ngày sinh"}</span></div></td>
                            <td><div className="doctor-cell"><strong>{patient.phone || "Chưa có số điện thoại"}</strong><span>{patient.email || "Chưa có email"}</span></div></td>
                            <td><span className="status-badge confirmed">{getPatientStatus(patient.status)}</span></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                </article>

                <article className="panel activity-panel">
                  <div className="panel-heading"><div><h2>Tình trạng dữ liệu</h2><p>Trạng thái kết nối các nhóm dữ liệu</p></div></div>
                  <div className="activity-legend dashboard-data-legend">
                    <div><span className="legend-dot confirmed-dot" /><span>Hồ sơ bệnh nhân đã tải</span><strong>{loadingOverview ? "…" : patients.length}</strong></div>
                    <div><span className="legend-dot confirmed-dot" /><span>Hồ sơ bác sĩ đã tải</span><strong>{loadingOverview ? "…" : doctors.length}</strong></div>
                    <div><span className="legend-dot pending-dot" /><span>Tổng lịch khám</span><strong>{loadingOverview ? "…" : appointments.length}</strong></div>
                  </div>
                  <div className="activity-note"><HeartPulse size={19} /><p>Số liệu lịch khám được tải trực tiếp từ API của hệ thống.</p></div>
                </article>
              </section>

              <footer className="admin-footer">© 2026 Patient Portal · Hospital Management System</footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
