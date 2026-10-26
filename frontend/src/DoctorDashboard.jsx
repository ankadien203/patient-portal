import { useEffect, useState } from "react";
import {
  HeartPulse,
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  Pill,
  LogOut,
  Search,
  Bell,
  Clock3,
  UserRound,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  ArrowUpRight,
  Check,
  X,
} from "lucide-react";
import "./DoctorDashboard.css";

const MENU_ITEMS = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "patients", label: "Bệnh nhân của tôi", icon: Users },
  { id: "appointments", label: "Lịch khám", icon: CalendarDays },
  { id: "records", label: "Hồ sơ bệnh án", icon: ClipboardList },
  { id: "prescriptions", label: "Đơn thuốc", icon: Pill },
];

export default function DoctorDashboard({ onLogout }) {
  const [activePage, setActivePage] = useState("overview");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState("All");
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState(null);

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      onLogout();
      return;
    }

    let cancelled = false;

    async function loadPatients() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/patients", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401) {
          onLogout();
          return;
        }

        if (!response.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : "Không thể tải danh sách bệnh nhân."
          );
        }

        if (!Array.isArray(data)) {
          throw new Error("Dữ liệu bệnh nhân từ máy chủ không hợp lệ.");
        }

        if (!cancelled) {
          setPatients(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Không thể kết nối đến máy chủ.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPatients();

    return () => {
      cancelled = true;
    };
  }, [onLogout]);

  async function loadAppointments() {
    const token = sessionStorage.getItem("access_token");
    if (!token) {
      onLogout();
      return;
    }

    setAppointmentsLoading(true);
    setAppointmentsError("");
    try {
      const response = await fetch("/api/appointments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        onLogout();
        return;
      }
      if (!response.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : "Không thể tải lịch khám.");
      }
      if (!Array.isArray(data)) throw new Error("Dữ liệu lịch khám không hợp lệ.");
      setAppointments(data);
    } catch (err) {
      setAppointmentsError(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setAppointmentsLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
    // Tải lịch một lần khi dashboard được mở.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateAppointmentStatus(appointmentId, status) {
    const token = sessionStorage.getItem("access_token");
    if (!token) {
      onLogout();
      return;
    }
    setUpdatingAppointmentId(appointmentId);
    setAppointmentsError("");
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        onLogout();
        return;
      }
      if (!response.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : "Không thể cập nhật lịch hẹn.");
      }
      await loadAppointments();
    } catch (err) {
      setAppointmentsError(err.message || "Không thể cập nhật lịch hẹn.");
    } finally {
      setUpdatingAppointmentId(null);
    }
  }

  const filteredAppointments = appointments.filter((appointment) => {
    const keyword = search.trim().toLowerCase();
    const matchesSearch = !keyword || [
      appointment.patient_name,
      appointment.reason,
      appointment.id,
    ].some((value) => String(value ?? "").toLowerCase().includes(keyword));
    const matchesStatus = appointmentStatusFilter === "All" || appointment.status === appointmentStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const renderAppointments = () => {
    if (appointmentsLoading && appointments.length === 0) {
      return <div className="doctor-state"><RefreshCw className="doctor-spin" size={22} /><span>Đang tải lịch khám...</span></div>;
    }
    if (appointmentsError && appointments.length === 0) {
      return <div className="doctor-state doctor-state-error" role="alert"><AlertCircle size={21} /><span>{appointmentsError}</span><button type="button" className="doctor-button doctor-button-secondary" onClick={loadAppointments}>Thử lại</button></div>;
    }
    if (filteredAppointments.length === 0) {
      return <div className="doctor-empty"><CalendarDays size={32} /><strong>{appointments.length === 0 ? "Chưa có lịch khám" : "Không tìm thấy lịch phù hợp"}</strong><p>{appointments.length === 0 ? "Lịch hẹn được phân công cho bạn sẽ xuất hiện tại đây." : "Hãy đổi từ khóa hoặc bộ lọc trạng thái."}</p></div>;
    }
    return <div className="doctor-table-wrap"><table className="doctor-table"><thead><tr><th>BỆNH NHÂN</th><th>NGÀY / GIỜ</th><th>LÝ DO KHÁM</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>
      {filteredAppointments.map((appointment) => <tr key={appointment.id}>
        <td><div className="doctor-patient-cell"><div className="doctor-patient-avatar"><UserRound size={18} /></div><div><strong>{appointment.patient_name || `Bệnh nhân #${appointment.patient_id}`}</strong><span>Mã lịch: #{appointment.id}</span></div></div></td>
        <td>{formatDate(appointment.appointment_date)}<br /><span className="doctor-secondary-text">{formatTime(appointment.appointment_time)}</span></td>
        <td>{appointment.reason || "Không có ghi chú"}</td>
        <td><span className={`doctor-status ${appointmentStatusClass(appointment.status)}`}>{appointmentStatusLabel(appointment.status)}</span></td>
        <td><div className="doctor-appointment-actions">
          {appointment.status === "Pending" && <><button type="button" className="doctor-button doctor-button-secondary" disabled={updatingAppointmentId === appointment.id} onClick={() => updateAppointmentStatus(appointment.id, "Confirmed")} title="Xác nhận"><Check size={15} /> Xác nhận</button><button type="button" className="doctor-button doctor-button-danger" disabled={updatingAppointmentId === appointment.id} onClick={() => updateAppointmentStatus(appointment.id, "Rejected")} title="Từ chối"><X size={15} /> Từ chối</button></>}
          {appointment.status === "Confirmed" && <button type="button" className="doctor-button doctor-button-secondary" disabled={updatingAppointmentId === appointment.id} onClick={() => updateAppointmentStatus(appointment.id, "Completed")}><Check size={15} /> Hoàn thành</button>}
          {["Completed", "Cancelled", "Rejected"].includes(appointment.status) && <span className="doctor-secondary-text">Không có thao tác</span>}
        </div></td>
      </tr>)}
    </tbody></table></div>;
  };

  const filteredPatients = patients.filter((patient) => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return true;

    return [
      patient.full_name,
      patient.patient_code,
      patient.email,
      patient.phone,
    ].some((value) => String(value || "").toLowerCase().includes(keyword));
  });

  const renderPatientsTable = () => {
    if (loading) {
      return (
        <div className="doctor-state">
          <RefreshCw className="doctor-spin" size={22} />
          <span>Đang tải danh sách bệnh nhân...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="doctor-state doctor-state-error" role="alert">
          <AlertCircle size={21} />
          <span>{error}</span>
          <button
            type="button"
            className="doctor-button doctor-button-secondary"
            onClick={() => window.location.reload()}
          >
            Tải lại
          </button>
        </div>
      );
    }

    if (filteredPatients.length === 0) {
      return (
        <div className="doctor-empty">
          <Users size={32} />
          <strong>
            {patients.length === 0
              ? "Chưa có bệnh nhân được phân công"
              : "Không tìm thấy bệnh nhân"}
          </strong>
          <p>
            {patients.length === 0
              ? "Danh sách sẽ hiển thị khi bệnh nhân được phân công cho bạn."
              : "Hãy thử tìm kiếm bằng tên hoặc mã bệnh nhân khác."}
          </p>
        </div>
      );
    }

    return (
      <div className="doctor-table-wrap">
        <table className="doctor-table">
          <thead>
            <tr>
              <th>BỆNH NHÂN</th>
              <th>MÃ BỆNH NHÂN</th>
              <th>LIÊN HỆ</th>
              <th>TÌNH TRẠNG</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map((patient) => (
              <tr key={patient.id}>
                <td>
                  <div className="doctor-patient-cell">
                    <div className="doctor-patient-avatar">
                      <UserRound size={18} />
                    </div>
                    <div>
                      <strong>{patient.full_name}</strong>
                      <span>
                        {patient.gender
                          ? genderLabel(patient.gender)
                          : "Chưa cập nhật giới tính"}
                      </span>
                    </div>
                  </div>
                </td>
                <td>{patient.patient_code || "—"}</td>
                <td>
                  <div>{patient.phone || "Chưa có số điện thoại"}</div>
                  <span className="doctor-secondary-text">
                    {patient.email || "Chưa có email"}
                  </span>
                </td>
                <td>
                  <span
                    className={`doctor-status ${statusClass(patient.status)}`}
                  >
                    {statusLabel(patient.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderContent = () => {
    if (activePage === "patients") {
      return (
        <section className="doctor-panel">
          <div className="doctor-panel-heading">
            <div>
              <h2>Bệnh nhân của tôi</h2>
              <p>Danh sách bệnh nhân được phân công cho bạn</p>
            </div>
            <span className="doctor-count">
              {loading ? "Đang tải..." : `${patients.length} bệnh nhân`}
            </span>
          </div>
          {renderPatientsTable()}
        </section>
      );
    }

    if (activePage === "appointments") {
      return (
        <section className="doctor-panel">
          <div className="doctor-panel-heading">
            <div><h2>Quản lý lịch khám</h2><p>Xem và xử lý các lịch hẹn được phân công cho bạn</p></div>
            <button type="button" className="doctor-button doctor-button-secondary" onClick={loadAppointments} disabled={appointmentsLoading}><RefreshCw size={16} className={appointmentsLoading ? "doctor-spin" : ""} /> Làm mới</button>
          </div>
          {appointmentsError && <div className="doctor-state doctor-state-error" role="alert"><AlertCircle size={18} /><span>{appointmentsError}</span></div>}
          <div className="doctor-appointment-filters">
            <label>Trạng thái <select value={appointmentStatusFilter} onChange={(event) => setAppointmentStatusFilter(event.target.value)}><option value="All">Tất cả</option><option value="Pending">Chờ xác nhận</option><option value="Confirmed">Đã xác nhận</option><option value="Completed">Đã hoàn thành</option><option value="Rejected">Đã từ chối</option><option value="Cancelled">Đã hủy</option></select></label>
            <span className="doctor-count">{filteredAppointments.length} lịch hẹn</span>
          </div>
          {renderAppointments()}
        </section>
      );
    }

    if (activePage === "records") {
      return (
        <FeaturePlaceholder
          icon={ClipboardList}
          title="Hồ sơ bệnh án"
          description="Chức năng quản lý bệnh án chưa được triển khai trong các file hiện tại."
          nextStep="Có thể bổ sung model bệnh án, API phân quyền và giao diện xem hoặc cập nhật hồ sơ."
        />
      );
    }

    if (activePage === "prescriptions") {
      return (
        <FeaturePlaceholder
          icon={Pill}
          title="Quản lý đơn thuốc"
          description="Chưa có model và API đơn thuốc trong cấu trúc backend đã kiểm tra."
          nextStep="Cần thiết kế dữ liệu đơn thuốc và chi tiết thuốc trước khi tích hợp chức năng kê đơn."
        />
      );
    }

    return (
      <>
        <section className="doctor-welcome">
          <div>
            <p className="doctor-eyebrow">KHÔNG GIAN LÀM VIỆC BÁC SĨ</p>
            <h1>Tổng quan</h1>
            <p>
              Chào mừng bạn quay lại. Đây là tổng quan công việc của bạn.
            </p>
          </div>
          <div className="doctor-date">
            <CalendarDays size={18} />
            {new Date().toLocaleDateString("vi-VN")}
          </div>
        </section>

        <section className="doctor-stats-grid">
          <StatCard
            icon={Users}
            title="Bệnh nhân được phân công"
            value={loading ? "…" : error ? "—" : patients.length}
            note="Dữ liệu từ hệ thống"
            type="teal"
          />
          <StatCard
            icon={CalendarDays}
            title="Lịch khám hôm nay"
            value={appointmentsLoading ? "…" : appointments.filter((item) => item.appointment_date === new Date().toISOString().slice(0, 10)).length}
            note="Lịch hẹn trong ngày"
            type="blue"
          />
          <StatCard
            icon={ClipboardList}
            title="Hồ sơ bệnh án"
            value="—"
            note="Chưa có API bệnh án"
            type="purple"
          />
          <StatCard
            icon={Clock3}
            title="Lịch hẹn cần xử lý"
            value={appointments.filter((item) => item.status === "Pending").length}
            note="Đang chờ bạn xử lý"
            type="orange"
          />
        </section>

        <section className="doctor-panel">
          <div className="doctor-panel-heading">
            <div>
              <h2>Bệnh nhân được phân công</h2>
              <p>Thông tin được tải trực tiếp từ backend</p>
            </div>
            <button
              type="button"
              className="doctor-link-button"
              onClick={() => setActivePage("patients")}
            >
              Xem danh sách <ArrowUpRight size={16} />
            </button>
          </div>
          {renderPatientsTable()}
        </section>

        <section className="doctor-panel">
          <div className="doctor-panel-heading"><div><h2>Lịch khám gần đây</h2><p>Các lịch hẹn được phân công cho bạn</p></div><button type="button" className="doctor-link-button" onClick={() => setActivePage("appointments")}>Xem lịch khám <ArrowUpRight size={16} /></button></div>
          {appointmentsError && appointments.length === 0 ? <p className="doctor-secondary-text">{appointmentsError}</p> : <div className="doctor-appointment-summary">{appointments.slice(0, 3).map((item) => <div className="doctor-appointment-summary-item" key={item.id}><div><strong>{item.patient_name}</strong><span>{formatDate(item.appointment_date)} · {formatTime(item.appointment_time)}</span></div><span className={`doctor-status ${appointmentStatusClass(item.status)}`}>{appointmentStatusLabel(item.status)}</span></div>)}{appointments.length === 0 && <p className="doctor-secondary-text">Chưa có lịch hẹn.</p>}</div>}
        </section>

        <section className="doctor-notice">
          <CheckCircle2 size={20} />
          <div>
            <strong>Hệ thống xác thực đã được tích hợp</strong>
            <p>
              Danh sách bệnh nhân sử dụng tài khoản bác sĩ đang đăng nhập.
              Lịch khám được tải từ backend và tự lọc theo tài khoản bác sĩ đang đăng nhập. Hồ sơ bệnh án sẽ được tích hợp ở bước tiếp theo.
            </p>
          </div>
        </section>
      </>
    );
  };

  return (
    <div className="doctor-layout">
      <aside className="doctor-sidebar">
        <div className="doctor-brand">
          <div className="doctor-brand-icon">
            <HeartPulse size={25} />
          </div>
          <div>
            <strong>Patient Portal</strong>
            <span>DOCTOR WORKSPACE</span>
          </div>
        </div>

        <div className="doctor-sidebar-label">KHÔNG GIAN BÁC SĨ</div>

        <nav className="doctor-nav">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                className={`doctor-nav-link ${
                  activePage === item.id ? "active" : ""
                }`}
                onClick={() => setActivePage(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="doctor-sidebar-bottom">
          <div className="doctor-profile">
            <div className="doctor-profile-avatar">
              <Stethoscope size={19} />
            </div>
            <div className="doctor-profile-info">
              <strong>Bác sĩ</strong>
              <span>Tài khoản đang đăng nhập</span>
            </div>
          </div>

          <button
            type="button"
            className="doctor-nav-link doctor-logout"
            onClick={onLogout}
          >
            <LogOut size={19} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <main className="doctor-main">
        <header className="doctor-header">
          <div className="doctor-header-title">
            <Stethoscope size={20} />
            <span>Doctor Dashboard</span>
          </div>

          <div className="doctor-header-actions">
            <div className="doctor-role-badge">
              <CheckCircle2 size={15} />
              Bác sĩ
            </div>
            <div className="doctor-header-divider" />
            <button
              type="button"
              className="doctor-notification"
              aria-label="Thông báo"
              title="Thông báo"
              onClick={() =>
                window.alert("Chức năng thông báo sẽ được bổ sung sau.")
              }
            >
              <Bell size={19} />
            </button>
          </div>
        </header>

        <div className="doctor-content">
          {(activePage === "patients" || activePage === "appointments") && (
            <div className="doctor-page-toolbar">
              <div className="doctor-search">
                <Search size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={activePage === "appointments" ? "Tìm theo tên bệnh nhân, lý do khám, mã lịch..." : "Tìm theo tên, mã bệnh nhân, email..."}
                  aria-label={activePage === "appointments" ? "Tìm kiếm lịch khám" : "Tìm kiếm bệnh nhân"}
                />
              </div>
            </div>
          )}

          {activePage === "overview" && (
            <div className="doctor-page-toolbar doctor-overview-toolbar">
              <div className="doctor-search">
                <Search size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm bệnh nhân..."
                  aria-label="Tìm kiếm bệnh nhân"
                />
              </div>
              <button
                type="button"
                className="doctor-button doctor-button-secondary"
                onClick={() => setActivePage("patients")}
              >
                <Users size={16} />
                Danh sách bệnh nhân
              </button>
            </div>
          )}

          {renderContent()}

          <footer className="doctor-footer">
            © 2026 Patient Portal · Hospital Management System
          </footer>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, note, type }) {
  return (
    <article className="doctor-stat-card">
      <div className={`doctor-stat-icon ${type}`}>
        <Icon size={22} />
      </div>
      <div className="doctor-stat-title">{title}</div>
      <div className="doctor-stat-value">{value}</div>
      <div className="doctor-stat-note">{note}</div>
    </article>
  );
}

function FeaturePlaceholder({ icon: Icon, title, description, nextStep }) {
  return (
    <section className="doctor-panel doctor-feature-placeholder">
      <div className="doctor-placeholder-icon">
        <Icon size={28} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="doctor-placeholder-note">
        <AlertCircle size={18} />
        <span>{nextStep}</span>
      </div>
    </section>
  );
}

function genderLabel(value) {
  return (
    {
      Male: "Nam",
      Female: "Nữ",
      Other: "Khác",
    }[value] || value
  );
}

function statusLabel(value) {
  return (
    {
      Waiting: "Đang chờ",
      "Under Treatment": "Đang điều trị",
      Discharged: "Đã xuất viện",
    }[value] || value || "Chưa cập nhật"
  );
}

function statusClass(value) {
  return (
    {
      Waiting: "waiting",
      "Under Treatment": "treatment",
      Discharged: "discharged",
    }[value] || "unknown"
  );
}

function formatDate(value) {
  if (!value) return "Chưa xác định ngày";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("vi-VN");
}

function formatTime(value) {
  if (!value) return "Chưa xác định giờ";
  return String(value).slice(0, 5);
}

function appointmentStatusLabel(value) {
  return ({ Pending: "Chờ xác nhận", Confirmed: "Đã xác nhận", Completed: "Đã hoàn thành", Cancelled: "Đã hủy", Rejected: "Đã từ chối" })[value] || value || "Chưa cập nhật";
}

function appointmentStatusClass(value) {
  return ({ Pending: "waiting", Confirmed: "treatment", Completed: "discharged", Cancelled: "unknown", Rejected: "unknown" })[value] || "unknown";
}
