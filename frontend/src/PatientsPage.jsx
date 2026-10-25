import { useEffect, useState } from "react";
import {
  Search,
  UserPlus,
  Users,
  Eye,
  Pencil,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import "./PatientsPage.css";

const GENDER_TO_VI = {
  Male: "Nam",
  Female: "Nữ",
  Other: "Khác",
};

const GENDER_TO_API = {
  Nam: "Male",
  Nữ: "Female",
  Khác: "Other",
};

const STATUS_TO_VI = {
  Waiting: "Chờ khám",
  "Under Treatment": "Đang điều trị",
  Discharged: "Đã xuất viện",
};

const STATUS_TO_API = {
  "Chờ khám": "Waiting",
  "Đang điều trị": "Under Treatment",
  "Đã xuất viện": "Discharged",
  "Ổn định": "Discharged",
};

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "";

  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();

  const hasNotHadBirthday =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() < birthDate.getDate());

  if (hasNotHadBirthday) age--;
  return age >= 0 ? age : "";
}

function formatPatient(patient) {
  return {
    id: patient.patient_code,
    dbId: patient.id,
    name: patient.full_name,
    gender: GENDER_TO_VI[patient.gender] || "Chưa cập nhật",
    age: calculateAge(patient.date_of_birth),
    phone: patient.phone || "",
    email: patient.email || "",
    department: "Chưa phân công",
    status: STATUS_TO_VI[patient.status] || patient.status || "Chờ khám",
    dateOfBirth: patient.date_of_birth || "",
    address: patient.address || "",
  };
}

function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  async function loadPatients() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/patients");

      if (!response.ok) {
        throw new Error(`Không thể tải danh sách bệnh nhân (HTTP ${response.status}).`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Dữ liệu trả về từ API không đúng định dạng.");
      }

      setPatients(data.map(formatPatient));
    } catch (err) {
      console.error("Lỗi tải danh sách bệnh nhân:", err);
      setError(err.message || "Không thể tải danh sách bệnh nhân. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  const filteredPatients = patients.filter((patient) => {
    const keyword = search.trim().toLowerCase();

    const matchesSearch =
      patient.name.toLowerCase().includes(keyword) ||
      patient.id.toLowerCase().includes(keyword) ||
      patient.phone.toLowerCase().includes(keyword);

    const matchesStatus =
      statusFilter === "Tất cả" || patient.status === statusFilter;

    return matchesSearch && matchesStatus;
  });


async function savePatient(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);

  const patientCode = String(editingPatient?.id || data.get("id") || "").trim();
  const fullName = String(data.get("name") || "").trim();
  const gender = String(data.get("gender") || "Nam");
  const phone = String(data.get("phone") || "").trim();
  const email = String(data.get("email") || "").trim();
  const address = String(data.get("address") || "").trim();
  const dateOfBirth = String(data.get("date_of_birth") || "");
  const status = String(data.get("status") || "Chờ khám");

  if (!patientCode || !fullName) {
    alert("Vui lòng nhập mã bệnh nhân và họ tên.");
    return;
  }

  // Chỉ kiểm tra trùng mã khi thêm bệnh nhân mới.
  if (
    !editingPatient &&
    patients.some((patient) => patient.id === patientCode)
  ) {
    alert("Mã bệnh nhân đã tồn tại trong danh sách đang tải.");
    return;
  }

  const patientData = {
    patient_code: patientCode,
    full_name: fullName,
    date_of_birth: dateOfBirth || null,
    gender: GENDER_TO_API[gender] || "Other",
    phone: phone || null,
    email: email || null,
    address: address || null,
    status: STATUS_TO_API[status] || "Waiting",
  };

  setSaving(true);

  try {
    // Đang sửa thì gọi PUT; thêm mới thì gọi POST.
    const isEditing = Boolean(editingPatient);

    const url = isEditing
      ? `/api/patients/${editingPatient.dbId}`
      : "/api/patients";

    const response = await fetch(url, {
      method: isEditing ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        isEditing
          ? (({ patient_code, ...updateData }) => updateData)(patientData)
          : patientData
      ),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail =
        typeof result.detail === "string"
          ? result.detail
          : response.status === 404
            ? "Không tìm thấy bệnh nhân."
            : response.status === 409
              ? "Mã bệnh nhân đã tồn tại."
              : `Không thể ${isEditing ? "cập nhật" : "thêm"} bệnh nhân (HTTP ${response.status}).`;

      throw new Error(detail);
    }

    // Thay bệnh nhân vừa sửa trong danh sách hoặc thêm bệnh nhân mới.
    // Tải lại danh sách từ database sau khi thêm hoặc cập nhật.
    await loadPatients();

    setEditingPatient(null);
    setShowAddForm(false);
    form.reset();

    alert(
      isEditing
        ? "Cập nhật thông tin bệnh nhân thành công."
        : "Đã thêm bệnh nhân vào database thành công."
    );
  } catch (err) {
    console.error("Lỗi lưu bệnh nhân:", err);
    alert(err.message || "Không thể lưu bệnh nhân. Vui lòng thử lại.");
  } finally {
    setSaving(false);
  }
}


async function deletePatient(patient) {
  const confirmed = window.confirm(
    `Bạn có chắc muốn xóa bệnh nhân ${patient.name} (${patient.id}) không?`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/patients/${patient.dbId}`, {
      method: "DELETE",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.detail || `Không thể xóa bệnh nhân (HTTP ${response.status}).`
      );
    }

    // Xóa thành công thì tải lại danh sách từ database.
    await loadPatients();

    // Nếu bệnh nhân vừa xóa đang được mở ở cửa sổ chi tiết, đóng cửa sổ.
    if (selectedPatient?.dbId === patient.dbId) {
      setSelectedPatient(null);
    }

    // Nếu bệnh nhân vừa xóa đang được sửa, đóng form sửa.
    if (editingPatient?.dbId === patient.dbId) {
      closeForm();
    }

    alert("Xóa bệnh nhân thành công.");
  } catch (err) {
    console.error("Lỗi xóa bệnh nhân:", err);
    alert(err.message || "Không thể xóa bệnh nhân. Vui lòng thử lại.");
  }
}

  function openEditForm(patient) {
    setEditingPatient(patient);
    setShowAddForm(true);
  }

  function closeForm() {
    setEditingPatient(null);
    setShowAddForm(false);
  }

  return (
    <section className="patients-page">
      <div className="patients-heading">
        <div>
          <p className="patients-eyebrow">QUẢN LÝ HỒ SƠ</p>
          <h1>Quản lý bệnh nhân</h1>
          <p className="patients-description">
            Theo dõi và quản lý thông tin bệnh nhân trong hệ thống.
          </p>
        </div>

        <button
          className="patients-add-button"
          onClick={() => {
            setEditingPatient(null);
            setShowAddForm(true);
          }}
        >
          <UserPlus size={18} />
          Thêm bệnh nhân
        </button>
      </div>

      <div className="patients-summary">
        <div className="patients-summary-icon">
          <Users size={24} />
        </div>
        <div>
          <span>Tổng số bệnh nhân</span>
          <strong>{patients.length}</strong>
        </div>
      </div>

      {loading ? (
        <div className="patients-panel">
          <p>Đang tải danh sách bệnh nhân...</p>
        </div>
      ) : error ? (
        <div className="patients-panel">
          <p role="alert">{error}</p>
          <button className="patients-add-button" onClick={loadPatients}>
            Thử tải lại
          </button>
        </div>
      ) : (
        <div className="patients-panel">
          <div className="patients-toolbar">
            <div className="patients-search">
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên, mã hoặc số điện thoại..."
              />
            </div>

            <div className="patients-filter">
              <Filter size={17} />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="Tất cả">Tất cả trạng thái</option>
                <option value="Chờ khám">Chờ khám</option>
                <option value="Đang điều trị">Đang điều trị</option>
                <option value="Đã xuất viện">Đã xuất viện</option>
              </select>
            </div>
          </div>

          <div className="patients-table-scroll">
            <table className="patients-table">
              <thead>
                <tr>
                  <th>MÃ BỆNH NHÂN</th>
                  <th>HỌ VÀ TÊN</th>
                  <th>GIỚI TÍNH</th>
                  <th>TUỔI</th>
                  <th>SỐ ĐIỆN THOẠI</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>

              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.dbId ?? patient.id}>
                    <td>
                      <span className="patients-id">{patient.id}</span>
                    </td>

                    <td>
                      <div className="patients-name-cell">
                        <div className="patients-avatar">
                          {patient.name.trim().split(/\s+/).pop().charAt(0)}
                        </div>
                        <div>
                          <strong>{patient.name}</strong>
                          <span>{patient.email || "Chưa có email"}</span>
                        </div>
                      </div>
                    </td>

                    <td>{patient.gender}</td>
                    <td>{patient.age === "" ? "—" : patient.age}</td>
                    <td>{patient.phone || "—"}</td>

                    <td>
                      <span
                        className={`patients-status ${
                          patient.status === "Đã xuất viện" ? "stable" : "treating"
                        }`}
                      >
                        {patient.status}
                      </span>
                    </td>

                    <td>
                      <div className="patients-actions">
                        <button
                          title="Xem chi tiết"
                          onClick={() => setSelectedPatient(patient)}
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          title="Chỉnh sửa"
                          onClick={() => openEditForm(patient)}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          title="Xóa bệnh nhân"
                          className="delete"
                          onClick={() => deletePatient(patient)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan="7" className="patients-empty">
                      Không tìm thấy bệnh nhân phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="patients-pagination">
            <span>
              Hiển thị {filteredPatients.length} / {patients.length} bệnh nhân
            </span>
            <div>
              <button disabled aria-label="Trang trước">
                <ChevronLeft size={18} />
              </button>
              <button className="current-page">1</button>
              <button disabled aria-label="Trang sau">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPatient && (
        <div
          className="patients-modal-backdrop"
          onClick={() => setSelectedPatient(null)}
        >
          <div
            className="patients-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="patients-modal-heading">
              <h2>Thông tin bệnh nhân</h2>
              <button onClick={() => setSelectedPatient(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="patients-detail-list">
              <p><span>Mã bệnh nhân</span><strong>{selectedPatient.id}</strong></p>
              <p><span>Họ và tên</span><strong>{selectedPatient.name}</strong></p>
              <p><span>Giới tính</span><strong>{selectedPatient.gender}</strong></p>
              <p><span>Tuổi</span><strong>{selectedPatient.age === "" ? "Chưa cập nhật" : selectedPatient.age}</strong></p>
              <p><span>Ngày sinh</span><strong>{selectedPatient.dateOfBirth || "Chưa cập nhật"}</strong></p>
              <p><span>Số điện thoại</span><strong>{selectedPatient.phone || "Chưa cập nhật"}</strong></p>
              <p><span>Email</span><strong>{selectedPatient.email || "Chưa cập nhật"}</strong></p>
              <p><span>Địa chỉ</span><strong>{selectedPatient.address || "Chưa cập nhật"}</strong></p>
              <p><span>Chuyên khoa</span><strong>{selectedPatient.department}</strong></p>
              <p><span>Trạng thái</span><strong>{selectedPatient.status}</strong></p>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="patients-modal-backdrop">
          <form className="patients-modal patients-form" onSubmit={savePatient}>
            <div className="patients-modal-heading">
              <h2>{editingPatient ? "Sửa bệnh nhân" : "Thêm bệnh nhân"}</h2>
              <button type="button" onClick={closeForm}>
                <X size={20} />
              </button>
            </div>

            <label>
              Mã bệnh nhân
              <input
                name="id"
                defaultValue={editingPatient?.id ?? ""}
                placeholder="Ví dụ: BN002"
                required
                disabled={Boolean(editingPatient)}
              />
            </label>

            <label>
              Họ và tên
              <input
                name="name"
                defaultValue={editingPatient?.name ?? ""}
                required
              />
            </label>

            <div className="patients-form-row">
              <label>
                Giới tính
                <select name="gender" defaultValue={editingPatient?.gender ?? "Nam"}>
                  <option>Nam</option>
                  <option>Nữ</option>
                  <option>Khác</option>
                </select>
              </label>

              <label>
                Ngày sinh
                <input
                  name="date_of_birth"
                  type="date"
                  defaultValue={editingPatient?.dateOfBirth ?? ""}
                />
              </label>
            </div>

            <label>
              Số điện thoại
              <input
                name="phone"
                type="tel"
                defaultValue={editingPatient?.phone ?? ""}
              />
            </label>

            <label>
              Email
              <input
                name="email"
                type="email"
                defaultValue={editingPatient?.email ?? ""}
              />
            </label>

            <label>
              Địa chỉ
              <input
                name="address"
                defaultValue={editingPatient?.address ?? ""}
              />
            </label>

            <label>
              Trạng thái
              <select
                name="status"
                defaultValue={editingPatient?.status ?? "Chờ khám"}
              >
                <option>Chờ khám</option>
                <option>Đang điều trị</option>
                <option>Đã xuất viện</option>
              </select>
            </label>

            <div className="patients-form-actions">
              <button type="button" onClick={closeForm}>
                Hủy
              </button>
              <button
                type="submit"
                className="patients-add-button"
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu thông tin"}
              </button>
            </div>


          </form>
        </div>
      )}
    </section>
  );
}

export default PatientsPage;
