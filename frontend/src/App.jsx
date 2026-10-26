import { useState } from "react";
import {
  HeartPulse,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  UserRound,
  Phone,
  CalendarDays,
  ArrowLeft,
  LogIn,
} from "lucide-react";

import "./App.css";
import AdminDashboard from "./AdminDashboard";
import PatientDashboard from "./PatientDashboard";
import DoctorDashboard from "./DoctorDashboard";
// =====================================================
// CẤU HÌNH API
// =====================================================
// Sử dụng đường dẫn tương đối để tương thích với Vite proxy
// và cấu hình Docker hiện tại của dự án.
const API_LOGIN_URL = "/api/auth/login";

// =====================================================
// GIẢI MÃ JWT ĐỂ XÁC ĐỊNH VAI TRÒ HIỂN THỊ GIAO DIỆN
// =====================================================
function getTokenPayload(token) {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );

    return JSON.parse(atob(paddedBase64));
  } catch {
    return null;
  }
}

// =====================================================
// COMPONENT APP
// =====================================================
function App() {
  const [page, setPage] = useState("login");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Thông tin đăng nhập
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  // Thông tin đăng ký
  const [registerData, setRegisterData] = useState({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    password: "",
    confirmPassword: "",
  });

  // ===================================================
  // ĐĂNG NHẬP BẰNG JWT
  // ===================================================
  async function handleLogin(event) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setLoginError("");

    try {
      const response = await fetch(API_LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginData.username.trim(),
          password: loginData.password,
        }),
      });

      // Đọc dữ liệu phản hồi từ backend
      const result = await response.json().catch(() => ({}));

      // Xử lý lỗi đăng nhập
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Tên đăng nhập hoặc mật khẩu không chính xác."
          );
        }

        if (response.status === 403) {
          throw new Error(
            "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên."
          );
        }

        if (response.status === 422) {
          throw new Error(
            "Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại."
          );
        }

        if (response.status >= 500) {
          throw new Error(
            "Máy chủ đang gặp sự cố. Vui lòng thử lại sau."
          );
        }

        throw new Error(
          result.detail || `Đăng nhập thất bại (HTTP ${response.status}).`
        );
      }

      // Kiểm tra JWT trả về
      if (!result.access_token) {
        throw new Error(
          "Máy chủ không trả về access_token hợp lệ."
        );
      }

      // Giải mã payload để đọc role phục vụ điều hướng giao diện.
      // Việc giải mã này KHÔNG thay thế xác thực ở backend.
      const payload = getTokenPayload(result.access_token);
      const role = payload?.role;

      if (!role) {
        throw new Error(
          "Không xác định được vai trò tài khoản trong JWT."
        );
      }

      // Lưu token trong phiên trình duyệt hiện tại
      sessionStorage.setItem(
        "access_token",
        result.access_token
      );

      sessionStorage.setItem("user_role", role);

      // Điều hướng theo vai trò
// Điều hướng theo vai trò
      if (role === "admin") {
        setPage("admin");
        return;
      }

      if (role === "doctor") {
        setPage("doctor");
        return;
      }

      if (role === "patient") {
        setPage("patient");
        return;
      }

      throw new Error(
        `Vai trò "${role}" chưa được hỗ trợ.`
      );
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);

      if (
        error instanceof TypeError ||
        error.message === "Failed to fetch"
      ) {
        setLoginError(
          "Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend và cấu hình API."
        );
      } else {
        setLoginError(
          error.message || "Đã xảy ra lỗi. Vui lòng thử lại."
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  // ===================================================
  // ĐĂNG XUẤT
  // ===================================================
  function handleLogout() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user_role");

    setLoginData({
      username: "",
      password: "",
    });

    setLoginError("");
    setShowPassword(false);
    setPage("login");
  }


// ===================================================
// ĐĂNG KÝ TÀI KHOẢN BỆNH NHÂN
// ===================================================
async function handleRegister(event) {
  event.preventDefault();

  if (registerData.password !== registerData.confirmPassword) {
    alert("Mật khẩu xác nhận không khớp.");
    return;
  }

  if (registerData.password.length < 8) {
    alert("Mật khẩu phải có ít nhất 8 ký tự.");
    return;
  }

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: registerData.email.trim().toLowerCase(),
        email: registerData.email.trim().toLowerCase(),
        password: registerData.password,
        full_name: registerData.fullName.trim(),
        phone: registerData.phone.trim(),
        date_of_birth: registerData.dateOfBirth || null,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      let message = "Đăng ký thất bại. Vui lòng thử lại.";

      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data.detail)) {
        message = data.detail
          .map((item) => {
            const field = Array.isArray(item.loc)
              ? item.loc[item.loc.length - 1]
              : "Thông tin";

            return `${field}: ${item.msg || "Dữ liệu không hợp lệ"}`;
          })
          .join("\n");
      } else if (typeof data.message === "string") {
        message = data.message;
      }

      throw new Error(message);
    }

    alert("Đăng ký tài khoản thành công! Bạn có thể đăng nhập.");

    // Chuyển về trang đăng nhập
    setLoginData({
      username: registerData.email.trim().toLowerCase(),
      password: "",
    });

    setRegisterData({
      fullName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      password: "",
      confirmPassword: "",
    });

    setShowPassword(false);
    setShowConfirmPassword(false);
    setPage("login");
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    alert(error.message || "Không thể kết nối đến máy chủ.");
  }
}
  // ===================================================
  // HIỂN THỊ DASHBOARD QUẢN TRỊ
  // ===================================================
  if (page === "admin") {
    const token = sessionStorage.getItem("access_token");
    const role = sessionStorage.getItem("user_role");

    // Không cho phép hiển thị Dashboard nếu thiếu token
    // hoặc vai trò lưu trong phiên không phải admin.
    if (!token || role !== "admin") {
      return (
        <div className="login-page">
          <main className="login-main">
            <div className="login-card">
              <h2>Phiên đăng nhập không hợp lệ</h2>

              <p className="form-description">
                Vui lòng đăng nhập lại để tiếp tục.
              </p>

              <button
                type="button"
                className="login-button"
                onClick={handleLogout}
              >
                Quay lại đăng nhập
                <ArrowRight size={19} />
              </button>
            </div>
          </main>
        </div>
      );
    }

    return <AdminDashboard onLogout={handleLogout} />;
  }

  // ===================================================
  // HIỂN THỊ DASHBOARD BỆNH NHÂN
  // ===================================================
  if (page === "patient") {
    const token = sessionStorage.getItem("access_token");
    const role = sessionStorage.getItem("user_role");

    if (!token || role !== "patient") {
      return (
        <div className="login-page">
          <main className="login-main">
            <div className="login-card">
              <h2>Phiên đăng nhập không hợp lệ</h2>
              <p className="form-description">
                Vui lòng đăng nhập lại để tiếp tục.
              </p>
              <button
                type="button"
                className="login-button"
                onClick={handleLogout}
              >
                Quay lại đăng nhập
                <ArrowRight size={19} />
              </button>
            </div>
          </main>
        </div>
      );
    }

    return <PatientDashboard onLogout={handleLogout} />;
  }
  if (page === "doctor") {
  const token = sessionStorage.getItem("access_token");
  const role = getTokenPayload(token)?.role;

  if (!token || role !== "doctor") {
    return null;
  }

  return <DoctorDashboard onLogout={handleLogout} />;
}

  const isRegister = page === "register";

  // ===================================================
  // GIAO DIỆN ĐĂNG NHẬP / ĐĂNG KÝ
  // ===================================================
  return (
    <div className="login-page">
      {/* BANNER BÊN TRÁI */}
      <section className="login-banner">
        <div className="brand">
          <div className="brand-icon">
            <HeartPulse size={27} />
          </div>

          <span>Patient Portal</span>
        </div>

        <div className="banner-content">
          <span className="eyebrow">
            YOUR HEALTH, OUR PRIORITY
          </span>

          <h1>
            Chăm sóc sức khỏe
            <br />
            bắt đầu từ đây.
          </h1>

          <p>
            Quản lý lịch khám, theo dõi thông tin sức khỏe
            và kết nối với đội ngũ y tế trong một nền tảng duy nhất.
          </p>

          <div className="banner-note">
            <HeartPulse size={20} />

            <span>
              Đồng hành cùng bạn trên hành trình khỏe mạnh.
            </span>
          </div>
        </div>

        <div className="banner-footer">
          PATIENT PORTAL · HEALTHCARE MANAGEMENT SYSTEM
        </div>
      </section>

      {/* KHU VỰC BIỂU MẪU */}
      <main className="login-main">
        <div className="login-card">
          <div className="mobile-brand">
            <HeartPulse size={28} />

            <span>Patient Portal</span>
          </div>

          {/* NÚT QUAY LẠI */}
          {isRegister && (
            <button
              type="button"
              className="back-button"
              onClick={() => {
                setPage("login");
                setLoginError("");
              }}
            >
              <ArrowLeft size={17} />
              Quay lại đăng nhập
            </button>
          )}

          <span className="form-label">
            {isRegister
              ? "THAM GIA CÙNG CHÚNG TÔI"
              : "CHÀO MỪNG BẠN"}
          </span>

          <h2>
            {isRegister ? "Tạo tài khoản" : "Đăng nhập"}
          </h2>

          <p className="form-description">
            {isRegister
              ? "Điền thông tin bên dưới để tạo tài khoản bệnh nhân."
              : "Vui lòng nhập thông tin để truy cập tài khoản của bạn."}
          </p>

          {/* =========================================
              FORM ĐĂNG KÝ
          ========================================= */}
          {isRegister ? (
            <form onSubmit={handleRegister}>
              <label htmlFor="fullName">Họ và tên</label>

              <div className="input-wrapper">
                <UserRound size={19} />

                <input
                  id="fullName"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                  value={registerData.fullName}
                  onChange={(event) =>
                    setRegisterData({
                      ...registerData,
                      fullName: event.target.value,
                    })
                  }
                  required
                />
              </div>

              <label htmlFor="registerEmail">
                Địa chỉ email
              </label>

              <div className="input-wrapper">
                <Mail size={19} />

                <input
                  id="registerEmail"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  value={registerData.email}
                  onChange={(event) =>
                    setRegisterData({
                      ...registerData,
                      email: event.target.value,
                    })
                  }
                  required
                />
              </div>

              <label htmlFor="phone">Số điện thoại</label>

              <div className="input-wrapper">
                <Phone size={19} />

                <input
                  id="phone"
                  type="tel"
                  placeholder="09xxxxxxxx"
                  autoComplete="tel"
                  value={registerData.phone}
                  onChange={(event) =>
                    setRegisterData({
                      ...registerData,
                      phone: event.target.value,
                    })
                  }
                  required
                />
              </div>

              <label htmlFor="dateOfBirth">Ngày sinh</label>

              <div className="input-wrapper">
                <CalendarDays size={19} />

                <input
                  id="dateOfBirth"
                  type="date"
                  autoComplete="bday"
                  value={registerData.dateOfBirth}
                  onChange={(event) =>
                    setRegisterData({
                      ...registerData,
                      dateOfBirth: event.target.value,
                    })
                  }
                  required
                />
              </div>

              <label htmlFor="registerPassword">
                Mật khẩu
              </label>

              <div className="input-wrapper">
                <Lock size={19} />

                <input
                  id="registerPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Tối thiểu 8 ký tự"
                  autoComplete="new-password"
                  minLength={8}
                  value={registerData.password}
                  onChange={(event) =>
                    setRegisterData({
                      ...registerData,
                      password: event.target.value,
                    })
                  }
                  required
                />

                <button
                  className="password-toggle"
                  type="button"
                  aria-label="Hiện hoặc ẩn mật khẩu"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>

              <label htmlFor="confirmPassword">
                Xác nhận mật khẩu
              </label>

              <div className="input-wrapper">
                <Lock size={19} />

                <input
                  id="confirmPassword"
                  type={
                    showConfirmPassword ? "text" : "password"
                  }
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                  minLength={8}
                  value={registerData.confirmPassword}
                  onChange={(event) =>
                    setRegisterData({
                      ...registerData,
                      confirmPassword: event.target.value,
                    })
                  }
                  required
                />

                <button
                  className="password-toggle"
                  type="button"
                  aria-label="Hiện hoặc ẩn mật khẩu xác nhận"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>

              <button
                className="login-button"
                type="submit"
              >
                Tạo tài khoản
                <ArrowRight size={19} />
              </button>

              <p className="register-prompt">
                Đã có tài khoản?{" "}

                <a
                  href="#login"
                  onClick={(event) => {
                    event.preventDefault();
                    setPage("login");
                    setShowPassword(false);
                  }}
                >
                  Đăng nhập
                </a>
              </p>
            </form>
          ) : (
            /* =======================================
               FORM ĐĂNG NHẬP
            ======================================= */
            <form onSubmit={handleLogin}>
              <label htmlFor="username">
                Tên đăng nhập
              </label>

              <div className="input-wrapper">
                <UserRound size={19} />

                <input
                  id="username"
                  type="text"
                  placeholder="Nhập tên đăng nhập"
                  autoComplete="username"
                  value={loginData.username}
                  onChange={(event) => {
                    setLoginData({
                      ...loginData,
                      username: event.target.value,
                    });

                    if (loginError) {
                      setLoginError("");
                    }
                  }}
                  required
                />
              </div>

              <div className="password-heading">
                <label htmlFor="password">
                  Mật khẩu
                </label>

                <a
                  href="#forgot-password"
                  onClick={(event) => {
                    event.preventDefault();

                    alert(
                      "Chức năng quên mật khẩu sẽ được bổ sung sau."
                    );
                  }}
                >
                  Quên mật khẩu?
                </a>
              </div>

              <div className="input-wrapper">
                <Lock size={19} />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  value={loginData.password}
                  onChange={(event) => {
                    setLoginData({
                      ...loginData,
                      password: event.target.value,
                    });

                    if (loginError) {
                      setLoginError("");
                    }
                  }}
                  required
                />

                <button
                  className="password-toggle"
                  type="button"
                  aria-label="Hiện hoặc ẩn mật khẩu"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>

              {/* THÔNG BÁO LỖI */}
              {loginError && (
                <div
                  role="alert"
                  style={{
                    color: "#dc2626",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    marginTop: "12px",
                    marginBottom: "12px",
                    fontSize: "13px",
                    lineHeight: 1.5,
                  }}
                >
                  {loginError}
                </div>
              )}

              <button
                className="login-button"
                type="submit"
                disabled={isLoading}
                style={{
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {isLoading ? (
                  <>
                    Đang đăng nhập...
                    <LogIn size={19} />
                  </>
                ) : (
                  <>
                    Đăng nhập
                    <ArrowRight size={19} />
                  </>
                )}
              </button>

              <p className="register-prompt">
                Bạn chưa có tài khoản?{" "}

                <a
                  href="#register"
                  onClick={(event) => {
                    event.preventDefault();

                    setPage("register");
                    setShowPassword(false);
                    setLoginError("");
                  }}
                >
                  Đăng ký ngay
                </a>
              </p>
            </form>
          )}

          {/* GHI CHÚ BẢO MẬT */}
          <div className="security-note">
            <Lock size={15} />

            <span>
              Thông tin của bạn cần được bảo vệ an toàn.
            </span>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="page-footer">
          © 2026 Patient Portal. Hệ thống quản lý khám bệnh.

          <div style={{ marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => {
                alert(
                  "Dashboard quản trị chỉ có thể truy cập sau khi đăng nhập bằng tài khoản admin."
                );
              }}
              style={{
                border: "none",
                background: "transparent",
                color: "#087f8c",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "12px",
              }}
            >
              Dashboard quản trị
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;