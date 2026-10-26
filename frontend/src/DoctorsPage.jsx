import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Stethoscope, RefreshCw, X, Pencil } from "lucide-react";
import "./DoctorsPage.css";

const EMPTY_FORM = {
  full_name: "",
  username: "",
  email: "",
  password: "",
  specialization: "",
  license_number: "",
  phone: "",
  department: "",
};

const EDIT_FIELDS = [
  ["full_name", "Họ và tên", "text"],
  ["email", "Email", "email"],
  ["specialization", "Chuyên khoa", "text"],
  ["license_number", "Số giấy phép hành nghề", "text"],
  ["phone", "Số điện thoại", "tel"],
  ["department", "Khoa / phòng ban", "text"],
];

function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);

  async function loadDoctors() {
    setLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) throw new Error("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.");
      const response = await fetch("/api/doctors", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.detail || `Không thể tải danh sách bác sĩ (HTTP ${response.status}).`);
      }
      if (!Array.isArray(result)) throw new Error("Dữ liệu bác sĩ từ API không đúng định dạng.");
      setDoctors(result);
    } catch (err) {
      setError(err.message || "Không thể tải danh sách bác sĩ.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDoctors(); }, []);

  const filteredDoctors = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return doctors.filter((doctor) => [
      doctor.full_name, doctor.username, doctor.email,
      doctor.specialization, doctor.department, doctor.license_number,
    ].some((value) => String(value || "").toLowerCase().includes(keyword)));
  }, [doctors, search]);

  function getErrorMessage(detail, fallback) {
    const messages = {
      "Username already exists": "Username đã tồn tại. Hãy chọn username khác.",
      "Email already exists": "Email đã được sử dụng. Hãy nhập email khác.",
      "License number already exists": "Số giấy phép hành nghề đã tồn tại.",
      "Doctor not found": "Không tìm thấy hồ sơ bác sĩ.",
      "Doctor account not found": "Không tìm thấy tài khoản đăng nhập của bác sĩ.",
    };
    return messages[detail] || `${detail || fallback}`;
  }

  async function createDoctor(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setError("");
    setNotice("");
    const payload = Object.fromEntries(new FormData(form).entries());
    for (const key of ["specialization", "license_number", "phone", "department"]) {
      payload[key] = String(payload[key] || "").trim() || null;
    }
    for (const key of ["full_name", "username", "email"]) payload[key] = String(payload[key] || "").trim();
    payload.email = payload.email.toLowerCase();

    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) throw new Error("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.");
      const response = await fetch("/api/doctors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = typeof result.detail === "string" ? result.detail : "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.";
        throw new Error(getErrorMessage(detail, `Không thể tạo bác sĩ (HTTP ${response.status}).`));
      }
      setNotice(`Đã tạo tài khoản bác sĩ ${result.doctor?.full_name || payload.full_name} thành công.`);
      setShowForm(false);
      form.reset();
      await loadDoctors();
    } catch (err) {
      setError(err.message || "Không thể tạo bác sĩ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  function openEditForm(doctor) {
    setError("");
    setNotice("");
    setEditingDoctor(doctor);
  }

  async function updateDoctor(event) {
    event.preventDefault();
    if (!editingDoctor) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.full_name = String(payload.full_name || "").trim();
    payload.email = String(payload.email || "").trim().toLowerCase();
    for (const key of ["specialization", "license_number", "phone", "department"]) {
      payload[key] = String(payload[key] || "").trim() || null;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) throw new Error("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.");
      const response = await fetch(`/api/doctors/${editingDoctor.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = typeof result.detail === "string" ? result.detail : "";
        throw new Error(getErrorMessage(detail, `Không thể cập nhật bác sĩ (HTTP ${response.status}).`));
      }

      setNotice(`Đã cập nhật thông tin bác sĩ ${result.doctor?.full_name || payload.full_name} thành công.`);
      setEditingDoctor(null);
      await loadDoctors();
    } catch (err) {
      setError(err.message || "Không thể cập nhật thông tin bác sĩ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="doctors-page">
      <div className="doctors-heading">
        <div>
          <p className="doctors-eyebrow">QUẢN LÝ NHÂN SỰ Y TẾ</p>
          <h1>Quản lý bác sĩ</h1>
          <p className="doctors-description">Quản lý tài khoản đăng nhập và thông tin chuyên môn của bác sĩ.</p>
        </div>
        <button className="doctors-primary-button" onClick={() => { setError(""); setNotice(""); setShowForm(true); }}>
          <UserPlus size={18} /> Thêm bác sĩ
        </button>
      </div>

      <div className="doctors-summary">
        <div className="doctors-summary-icon"><Stethoscope size={24} /></div>
        <div><span>Tổng số bác sĩ</span><strong>{doctors.length}</strong></div>
      </div>

      {notice && <div className="doctors-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Đóng thông báo"><X size={16} /></button></div>}
      {error && !showForm && !editingDoctor && <div className="doctors-error" role="alert">{error}<button onClick={loadDoctors}><RefreshCw size={15} /> Thử lại</button></div>}

      <div className="doctors-panel">
        <div className="doctors-toolbar">
          <div className="doctors-search"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên, username, email, chuyên khoa..." /></div>
          <button className="doctors-refresh-button" onClick={loadDoctors} disabled={loading} title="Tải lại danh sách"><RefreshCw size={17} /></button>
        </div>

        {loading ? <div className="doctors-empty">Đang tải danh sách bác sĩ...</div> : error && doctors.length === 0 ? <div className="doctors-empty">Không thể tải dữ liệu. Hãy kiểm tra kết nối và thử lại.</div> : (
          <div className="doctors-table-scroll">
            <table className="doctors-table">
              <thead><tr><th>BÁC SĨ</th><th>TÀI KHOẢN</th><th>CHUYÊN KHOA</th><th>KHOA / PHÒNG BAN</th><th>SỐ ĐIỆN THOẠI</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead>
              <tbody>
                {filteredDoctors.map((doctor) => (
                  <tr key={doctor.id}>
                    <td><div className="doctors-person"><div className="doctors-avatar">{(doctor.full_name || "B").trim().split(/\s+/).pop().charAt(0).toUpperCase()}</div><div><strong>{doctor.full_name}</strong><span>{doctor.license_number ? `GPLH: ${doctor.license_number}` : "Chưa có số giấy phép"}</span></div></div></td>
                    <td><strong>{doctor.username}</strong><span className="doctors-secondary">{doctor.email}</span></td>
                    <td>{doctor.specialization || "—"}</td><td>{doctor.department || "—"}</td><td>{doctor.phone || "—"}</td>
                    <td><span className={`doctors-status ${doctor.is_active ? "active" : "inactive"}`}>{doctor.is_active ? "Đang hoạt động" : "Đã khóa"}</span></td>
                    <td><button type="button" className="doctors-edit-button" onClick={() => openEditForm(doctor)}><Pencil size={15} /> Chỉnh sửa</button></td>
                  </tr>
                ))}
                {filteredDoctors.length === 0 && <tr><td colSpan="7" className="doctors-empty">Không tìm thấy bác sĩ phù hợp.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <div className="doctors-table-footer">Hiển thị {filteredDoctors.length} / {doctors.length} bác sĩ</div>
      </div>

      {showForm && <div className="doctors-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setShowForm(false); }}>
        <form className="doctors-modal" onSubmit={createDoctor}>
          <div className="doctors-modal-heading"><div><p className="doctors-eyebrow">TÀI KHOẢN MỚI</p><h2>Thêm bác sĩ</h2></div><button type="button" className="doctors-close-button" onClick={() => setShowForm(false)} disabled={saving} aria-label="Đóng"><X size={20} /></button></div>
          <p className="doctors-form-note">Các trường có dấu * là bắt buộc. Mật khẩu sẽ được mã hóa trước khi lưu.</p>
          {error && <div className="doctors-error" role="alert">{error}</div>}
          <div className="doctors-form-grid">
            <label>Họ và tên *<input name="full_name" required maxLength="100" defaultValue={EMPTY_FORM.full_name} /></label>
            <label>Username *<input name="username" required minLength="3" maxLength="50" autoComplete="off" /></label>
            <label>Email *<input name="email" type="email" required maxLength="100" /></label>
            <label>Mật khẩu *<input name="password" type="password" required minLength="8" maxLength="128" autoComplete="new-password" /></label>
            <label>Chuyên khoa<input name="specialization" maxLength="100" placeholder="Ví dụ: Tim mạch" /></label>
            <label>Số giấy phép hành nghề<input name="license_number" maxLength="50" /></label>
            <label>Số điện thoại<input name="phone" type="tel" maxLength="20" /></label>
            <label>Khoa / phòng ban<input name="department" maxLength="100" placeholder="Ví dụ: Khoa Nội" /></label>
          </div>
          <div className="doctors-form-actions"><button type="button" className="doctors-cancel-button" onClick={() => setShowForm(false)} disabled={saving}>Hủy</button><button type="submit" className="doctors-primary-button" disabled={saving}>{saving ? "Đang tạo..." : "Tạo tài khoản bác sĩ"}</button></div>
        </form>
      </div>}

      {editingDoctor && <div className="doctors-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setEditingDoctor(null); }}>
        <form className="doctors-modal" onSubmit={updateDoctor}>
          <div className="doctors-modal-heading"><div><p className="doctors-eyebrow">CẬP NHẬT HỒ SƠ</p><h2>Chỉnh sửa bác sĩ</h2></div><button type="button" className="doctors-close-button" onClick={() => setEditingDoctor(null)} disabled={saving} aria-label="Đóng"><X size={20} /></button></div>
          <p className="doctors-form-note">Username và mật khẩu không thay đổi trong biểu mẫu này.</p>
          {error && <div className="doctors-error" role="alert">{error}</div>}
          <div className="doctors-form-grid">
            <label>Username<input value={editingDoctor.username || ""} readOnly /></label>
            {EDIT_FIELDS.map(([name, label, type]) => (
              <label key={name}>{label}{name === "full_name" || name === "email" ? " *" : ""}
                <input
                  name={name}
                  type={type}
                  required={name === "full_name" || name === "email"}
                  maxLength={name === "full_name" ? 100 : name === "email" ? 100 : name === "specialization" || name === "department" ? 100 : name === "license_number" ? 50 : 20}
                  defaultValue={editingDoctor[name] || ""}
                />
              </label>
            ))}
          </div>
          <div className="doctors-form-actions"><button type="button" className="doctors-cancel-button" onClick={() => setEditingDoctor(null)} disabled={saving}>Hủy</button><button type="submit" className="doctors-primary-button" disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</button></div>
        </form>
      </div>}
    </section>
  );
}

export default DoctorsPage;
