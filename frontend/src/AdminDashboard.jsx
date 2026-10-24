
import {
  HeartPulse,
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  BrainCircuit,
  Settings,
  Bell,
  Search,
  Clock3,
  CheckCircle2,
  CircleAlert,
  ArrowUpRight,
  Menu,
  LogOut,
} from "lucide-react";
import "./AdminDashboard.css";
import { useState } from "react";
import PatientsPage from "./PatientsPage";

const appointments = [
  {
    id: "APT-001",
    name: "Nguyễn Minh Anh",
    initials: "MA",
    doctor: "BS. Trần Hoàng Nam",
    department: "Tim mạch",
    time: "08:30",
    status: "Đã xác nhận",
  },
  {
    id: "APT-002",
    name: "Trần Thu Hà",
    initials: "TH",
    doctor: "BS. Lê Thu Trang",
    department: "Nội tổng quát",
    time: "09:00",
    status: "Chờ xác nhận",
  },
  {
    id: "APT-003",
    name: "Phạm Đức Long",
    initials: "ĐL",
    doctor: "BS. Nguyễn Hải An",
    department: "Da liễu",
    time: "09:30",
    status: "Đã xác nhận",
  },
  {
    id: "APT-004",
    name: "Lê Ngọc Mai",
    initials: "NM",
    doctor: "BS. Hoàng Minh Đức",
    department: "Nhi khoa",
    time: "10:00",
    status: "Chờ xác nhận",
  },
  {
    id: "APT-005",
    name: "Đỗ Quang Huy",
    initials: "QH",
    doctor: "BS. Trần Hoàng Nam",
    department: "Tim mạch",
    time: "10:30",
    status: "Đã xác nhận",
  },
];

const statistics = [
  {
    title: "Tổng bệnh nhân",
    value: "2,480",
    change: "+12.5%",
    icon: Users,
    type: "teal",
  },
  {
    title: "Lịch khám hôm nay",
    value: "148",
    change: "+8.2%",
    icon: CalendarDays,
    type: "blue",
  },
  {
    title: "Đội ngũ bác sĩ",
    value: "64",
    change: "Đang hoạt động",
    icon: Stethoscope,
    type: "purple",
  },
  {
    title: "Chờ xác nhận",
    value: "23",
    change: "Cần xử lý",
    icon: Clock3,
    type: "orange",
  },
];

function AdminDashboard() {
  const [activePage, setActivePage] = useState("overview");

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <HeartPulse size={25} />
          </div>
          <div>
            <strong>Patient Portal</strong>
            <span>HOSPITAL SYSTEM</span>
          </div>
        </div>

        <div className="sidebar-label">MENU CHÍNH</div>

        <nav className="admin-nav">
          <button
  type="button"
  className={`admin-nav-link ${activePage === "overview" ? "active" : ""}`}
  onClick={() => setActivePage("overview")}
>
  <LayoutDashboard size={19} />
  <span>Tổng quan</span>
</button>
          <button
  type="button"
  className={`admin-nav-link ${activePage === "patients" ? "active" : ""}`}
  onClick={() => setActivePage("patients")}
>
  <Users size={19} />
  <span>Bệnh nhân</span>
</button>
          <a href="#doctors" className="admin-nav-link">
            <Stethoscope size={19} />
            <span>Bác sĩ</span>
          </a>
          <a href="#appointments" className="admin-nav-link">
            <CalendarDays size={19} />
            <span>Lịch khám</span>
          </a>
          <a href="#ai-triage" className="admin-nav-link">
            <BrainCircuit size={19} />
            <span>AI Triage</span>
            <span className="nav-tag">AI</span>
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-label">HỆ THỐNG</div>
          <a href="#settings" className="admin-nav-link">
            <Settings size={19} />
            <span>Cài đặt</span>
          </a>
          <button
  className="admin-nav-link logout-button"
  onClick={() => {
    window.location.reload();
  }}
>
  <LogOut size={19} />
  <span>Đăng xuất</span>
</button>

          <div className="admin-profile">
            <div className="profile-avatar">AD</div>
            <div className="profile-info">
              <strong>Administrator</strong>
              <span>Quản trị viên</span>
            </div>
            <Settings size={17} />
          </div>
        </div>
      </aside>

      <main className="admin-main" id="overview">
        <header className="admin-header">
          <button className="mobile-menu" aria-label="Mở menu">
            <Menu size={22} />
          </button>

          <div className="header-search">
            <Search size={18} />
            <input placeholder="Tìm kiếm bệnh nhân, bác sĩ..." />
            <kbd>Ctrl K</kbd>
          </div>

          <div className="header-actions">
            <button className="notification-button" aria-label="Thông báo">
              <Bell size={20} />
              <span />
            </button>
            <div className="header-divider" />
            <div className="header-user">
              <div className="profile-avatar">AD</div>
              <div>
                <strong>Administrator</strong>
                <span>Quản trị viên</span>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-content">
          {activePage === "patients" ? (
  <PatientsPage />
) : (
  <>
          <section className="welcome-row">
            <div>
              <p className="dashboard-eyebrow">TỔNG QUAN HỆ THỐNG</p>
              <h1>Dashboard</h1>
              <p className="welcome-description">
                Xin chào, Administrator! Đây là tình hình hoạt động của bệnh viện.
              </p>
            </div>

            <button className="date-button">
              <CalendarDays size={18} />
              Hôm nay
            </button>
          </section>

          <section className="stats-grid">
            {statistics.map((item) => {
              const Icon = item.icon;

              return (
                <article className="stat-card" key={item.title}>
                  <div className={`stat-icon ${item.type}`}>
                    <Icon size={22} />
                  </div>

                  <div className="stat-title">{item.title}</div>
                  <div className="stat-value">{item.value}</div>

                  <div className={`stat-change ${item.type}`}>
                    {item.type === "orange"
                      ? <CircleAlert size={15} />
                      : <ArrowUpRight size={15} />}
                    {item.change}
                  </div>
                </article>
              );
            })}
          </section>

          <section className="dashboard-panels">
            <article className="panel appointment-panel">
              <div className="panel-heading">
                <div>
                  <h2>Lịch khám gần đây</h2>
                  <p>Danh sách lịch hẹn mới nhất trong hệ thống</p>
                </div>
                <a href="#appointments" className="view-all">
                  Xem tất cả <ArrowUpRight size={16} />
                </a>
              </div>

              <div className="table-scroll">
                <table className="appointment-table">
                  <thead>
                    <tr>
                      <th>BỆNH NHÂN</th>
                      <th>BÁC SĨ</th>
                      <th>GIỜ KHÁM</th>
                      <th>TRẠNG THÁI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td>
                          <div className="patient-cell">
                            <div className="patient-avatar">
                              {appointment.initials}
                            </div>
                            <div>
                              <strong>{appointment.name}</strong>
                              <span>{appointment.id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="doctor-cell">
                            <strong>{appointment.doctor}</strong>
                            <span>{appointment.department}</span>
                          </div>
                        </td>
                        <td>
                          <span className="appointment-time">
                            <Clock3 size={15} />
                            {appointment.time}
                          </span>
                        </td>
                        <td>
                          <span
                            className={
                              appointment.status === "Đã xác nhận"
                                ? "status-badge confirmed"
                                : "status-badge pending"
                            }
                          >
                            {appointment.status === "Đã xác nhận"
                              ? <CheckCircle2 size={14} />
                              : <Clock3 size={14} />}
                            {appointment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel activity-panel">
              <div className="panel-heading">
                <div>
                  <h2>Tình trạng lịch khám</h2>
                  <p>Tổng hợp lịch hẹn mẫu</p>
                </div>
              </div>

              <div className="activity-total">
                <span>Tổng số lịch hẹn</span>
                <strong>148</strong>
                <span className="activity-subtitle">Trong ngày hôm nay</span>
              </div>

              <div className="progress-track">
                <div className="progress-confirmed" />
                <div className="progress-pending" />
                <div className="progress-cancelled" />
              </div>

              <div className="activity-legend">
                <div>
                  <span className="legend-dot confirmed-dot" />
                  <span>Đã xác nhận</span>
                  <strong>96</strong>
                </div>
                <div>
                  <span className="legend-dot pending-dot" />
                  <span>Chờ xác nhận</span>
                  <strong>32</strong>
                </div>
                <div>
                  <span className="legend-dot cancelled-dot" />
                  <span>Khác</span>
                  <strong>20</strong>
                </div>
              </div>

              <div className="activity-note">
                <HeartPulse size={19} />
                <p>Số liệu trên là dữ liệu minh họa cho giao diện dashboard.</p>
              </div>
            </article>
          </section>

          <footer className="admin-footer">
  © 2026 Patient Portal · Hospital Management System
</footer>
</>
)}
</div>
</main>
    </div>
  );
}

export default AdminDashboard;
