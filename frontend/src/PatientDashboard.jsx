import { useCallback, useEffect, useState } from "react";
import {
  HeartPulse,
  UserRound,
  LogOut,
  RefreshCw,
  AlertCircle,
  CalendarDays,
  Clock,
  PlusCircle,
  XCircle,
} from "lucide-react";

const API_PATIENTS = "/api/patients";
const API_DOCTORS = "/api/doctors";
const API_APPOINTMENTS = "/api/appointments";

export default function PatientDashboard({ onLogout }) {
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    doctor_id: "",
    appointment_date: "",
    appointment_time: "",
    reason: "",
  });

  const token = sessionStorage.getItem("access_token");

  const request = useCallback(
    async (url, options = {}) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...options.headers,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        onLogout();
        throw new Error("Phiên đăng nhập đã hết hạn.");
      }

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : `Yêu cầu thất bại (HTTP ${response.status}).`
        );
      }

      return data;
    },
    [token, onLogout]
  );

  const loadAppointments = useCallback(async () => {
    setLoadingAppointments(true);

    try {
      const data = await request(API_APPOINTMENTS);
      setAppointments(Array.isArray(data) ? data : data.items || []);
    } catch (e) {
      setError(e.message || "Không thể tải lịch hẹn.");
    } finally {
      setLoadingAppointments(false);
    }
  }, [request]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!token) {
        onLogout();
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [patientData, appointmentData] = await Promise.all([
  request(API_PATIENTS),
  request(API_APPOINTMENTS),
]);
        if (!active) return;

        const patientList = Array.isArray(patientData)
          ? patientData
          : patientData.items || [patientData];

        if (!patientList.length) {
          throw new Error(
            "Tài khoản chưa được liên kết với hồ sơ bệnh nhân."
          );
        }

        setPatient(patientList[0]);

        setDoctors(
          Array.isArray(doctorData)
            ? doctorData
            : doctorData.items || []
        );

        setAppointments(
          Array.isArray(appointmentData)
            ? appointmentData
            : appointmentData.items || []
        );
      } catch (e) {
        if (active) {
          setError(e.message || "Không thể tải dữ liệu.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [token, request, onLogout]);

  async function handleCreateAppointment(event) {
    event.preventDefault();
    setError("");
    setMessage("");


    try {
      setSubmitting(true);

      await request(API_APPOINTMENTS, {
        method: "POST",
        body: JSON.stringify({
          appointment_date: form.appointment_date,
          appointment_time: form.appointment_time,
          reason: form.reason.trim() || null,
        }),
      });

      setMessage("Đặt lịch khám thành công! Lịch hẹn đang chờ xác nhận.");

      setForm({
        doctor_id: "",
        appointment_date: "",
        appointment_time: "",
        reason: "",
      });

      await loadAppointments();
    } catch (e) {
      setError(e.message || "Không thể tạo lịch hẹn.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelAppointment(appointmentId) {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn hủy lịch hẹn này không?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await request(`${API_APPOINTMENTS}/${appointmentId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Cancelled" }),
      });

      setMessage("Đã gửi yêu cầu hủy lịch hẹn.");
      await loadAppointments();
    } catch (e) {
      setError(e.message || "Không thể hủy lịch hẹn.");
    }
  }

  const today = getLocalDate();

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <HeartPulse size={28} />
          <strong>Patient Portal · Bệnh nhân</strong>
        </div>

        <button onClick={onLogout} style={styles.logoutButton}>
          <LogOut size={17} />
          Đăng xuất
        </button>
      </header>

      <main style={styles.main}>
        <h1>Dashboard bệnh nhân</h1>
        <p style={styles.subtitle}>
          Quản lý hồ sơ sức khỏe và lịch khám của bạn.
        </p>

        {error && (
          <div role="alert" style={styles.error}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div role="status" style={styles.success}>
            {message}
          </div>
        )}

        {loading ? (
          <p>
            <RefreshCw size={18} /> Đang tải dữ liệu...
          </p>
        ) : (
          <>
            {/* HỒ SƠ BỆNH NHÂN */}
            <section style={styles.card}>
              <div style={styles.sectionTitle}>
                <UserRound size={26} />
                <h2>{patient?.full_name || "Hồ sơ bệnh nhân"}</h2>
              </div>

              <div style={styles.infoGrid}>
                <Info label="Mã bệnh nhân" value={patient?.patient_code} />
                <Info label="Ngày sinh" value={patient?.date_of_birth} />
                <Info
                  label="Giới tính"
                  value={genderLabel(patient?.gender)}
                />
                <Info label="Email" value={patient?.email} />
                <Info label="Số điện thoại" value={patient?.phone} />
                <Info label="Địa chỉ" value={patient?.address} />
                <Info
                  label="Tình trạng"
                  value={statusLabel(patient?.status)}
                />
              </div>
            </section>

            {/* ĐẶT LỊCH KHÁM */}
            <section style={styles.card}>
              <div style={styles.sectionTitle}>
                <CalendarDays size={26} />
                <h2>Đặt lịch khám</h2>
              </div>

              <form onSubmit={handleCreateAppointment}>
                <div style={styles.formGrid}>
                  

                  <label style={styles.label}>
                    Ngày khám
                    <input
                      style={styles.input}
                      type="date"
                      min={today}
                      value={form.appointment_date}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          appointment_date: e.target.value,
                        })
                      }
                      required
                    />
                  </label>

                  <label style={styles.label}>
                    Giờ khám
                    <input
                      style={styles.input}
                      type="time"
                      value={form.appointment_time}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          appointment_time: e.target.value,
                        })
                      }
                      required
                    />
                  </label>

                  <label style={styles.label}>
                    Lý do khám
                    <textarea
                      style={{
                        ...styles.input,
                        minHeight: 90,
                        resize: "vertical",
                      }}
                      maxLength={2000}
                      placeholder="Mô tả ngắn gọn lý do khám..."
                      value={form.reason}
                      onChange={(e) =>
                        setForm({ ...form, reason: e.target.value })
                      }
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    ...styles.primaryButton,
                    opacity:
                      submitting? 0.6 : 1,
                  }}
                >
                  <PlusCircle size={18} />
                  {submitting ? "Đang đặt lịch..." : "Đặt lịch khám"}
                </button>

              
              </form>
            </section>

            {/* DANH SÁCH LỊCH HẸN */}
            <section style={styles.card}>
              <div style={styles.sectionTitle}>
                <Clock size={26} />
                <h2>Lịch hẹn của tôi</h2>

                <button
                  type="button"
                  onClick={loadAppointments}
                  style={styles.refreshButton}
                  disabled={loadingAppointments}
                  title="Tải lại lịch hẹn"
                >
                  <RefreshCw size={17} />
                </button>
              </div>

              {loadingAppointments ? (
                <p>Đang tải lịch hẹn...</p>
              ) : appointments.length === 0 ? (
                <p style={styles.hint}>
                  Bạn chưa có lịch hẹn nào.
                </p>
              ) : (
                <div style={styles.appointmentList}>
                  {appointments.map((appointment) => {
                    const canCancel = [
                      "Pending",
                      "Confirmed",
                    ].includes(appointment.status);

                    return (
                      <article
                        key={appointment.id}
                        style={styles.appointment}
                      >
                        <div style={styles.appointmentHeader}>
                          <h3>
                            {appointment.doctor_name ||
                              `Bác sĩ #${appointment.doctor_id}`}
                          </h3>

                          <span
                            style={{
                              ...styles.badge,
                              ...statusStyle(appointment.status),
                            }}
                          >
                            {appointmentStatusLabel(appointment.status)}
                          </span>
                        </div>

                        <p>
                          <CalendarDays
                            size={16}
                            style={styles.inlineIcon}
                          />
                          Ngày khám:{" "}
                          {formatDate(appointment.appointment_date)}
                        </p>

                        <p>
                          <Clock size={16} style={styles.inlineIcon} />
                          Giờ khám:{" "}
                          {String(appointment.appointment_time || "").slice(
                            0,
                            5
                          )}
                        </p>

                        {appointment.reason && (
                          <p>
                            <strong>Lý do:</strong> {appointment.reason}
                          </p>
                        )}

                        {canCancel && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCancelAppointment(appointment.id)
                            }
                            style={styles.cancelButton}
                          >
                            <XCircle size={16} />
                            Hủy lịch
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div style={styles.infoLabel}>{label}</div>
      <strong>{value || "Chưa cập nhật"}</strong>
    </div>
  );
}

function genderLabel(value) {
  return (
    { Male: "Nam", Female: "Nữ", Other: "Khác" }[value] || value
  );
}

function statusLabel(value) {
  return (
    {
      Waiting: "Đang chờ",
      "Under Treatment": "Đang điều trị",
      Discharged: "Đã xuất viện",
    }[value] || value
  );
}

function appointmentStatusLabel(value) {
  return (
    {
      Pending: "Chờ xác nhận",
      Confirmed: "Đã xác nhận",
      Completed: "Đã hoàn thành",
      Cancelled: "Đã hủy",
      Rejected: "Bị từ chối",
    }[value] || value
  );
}

function statusStyle(value) {
  return (
    {
      Pending: { background: "#fff7e6", color: "#ad6800" },
      Confirmed: { background: "#e6f7ff", color: "#096dd9" },
      Completed: { background: "#f6ffed", color: "#389e0d" },
      Cancelled: { background: "#f5f5f5", color: "#595959" },
      Rejected: { background: "#fff1f0", color: "#cf1322" },
    }[value] || { background: "#f5f5f5", color: "#595959" }
  );
}

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "Chưa cập nhật";

  const parts = String(value).slice(0, 10).split("-");
  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f7fb",
    color: "#18324b",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "20px 5%",
    background: "#123653",
    color: "white",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoutButton: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #ffffff55",
    background: "transparent",
    color: "white",
    cursor: "pointer",
  },
  main: {
    maxWidth: 1100,
    margin: "32px auto",
    padding: "0 20px 40px",
  },
  subtitle: {
    color: "#64788b",
    marginBottom: 24,
  },
  card: {
    marginTop: 24,
    padding: 26,
    borderRadius: 14,
    background: "white",
    boxShadow: "0 4px 20px #18324b0d",
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
  },
  infoLabel: {
    color: "#718397",
    fontSize: 13,
    marginBottom: 7,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 18,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #d5dee8",
    borderRadius: 8,
    font: "inherit",
    color: "#18324b",
    background: "white",
  },
  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    padding: "12px 18px",
    border: "none",
    borderRadius: 8,
    background: "#087f8c",
    color: "white",
    fontWeight: 600,
    cursor: "pointer",
  },
  refreshButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
    padding: 8,
    border: "1px solid #d5dee8",
    borderRadius: 8,
    background: "white",
    cursor: "pointer",
  },
  appointmentList: {
    display: "grid",
    gap: 16,
  },
  appointment: {
    padding: 18,
    border: "1px solid #e3eaf1",
    borderRadius: 10,
    background: "#fcfdff",
  },
  appointmentHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  badge: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
  },
  inlineIcon: {
    verticalAlign: "middle",
    marginRight: 6,
  },
  cancelButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    marginTop: 8,
    padding: "8px 12px",
    border: "1px solid #ffccc7",
    borderRadius: 8,
    background: "#fff1f0",
    color: "#cf1322",
    cursor: "pointer",
  },
  hint: {
    color: "#718397",
    fontSize: 13,
  },
  error: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 14,
    background: "#fff1f0",
    color: "#b42318",
    borderRadius: 10,
  },
  success: {
    padding: 14,
    background: "#f0fff4",
    color: "#237804",
    borderRadius: 10,
  },
};
