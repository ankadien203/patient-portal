
import { useState } from "react";
import {
  HeartPulse, Mail, Lock, Eye, EyeOff, ArrowRight,
  UserRound, Phone, CalendarDays, ArrowLeft
} from "lucide-react";
import "./App.css";
import AdminDashboard from "./AdminDashboard";

function App() {
  const [page, setPage] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    password: "",
    confirmPassword: "",
  });

  function handleLogin(event) {
    event.preventDefault();
    alert("Giao diện đăng nhập đã hoạt động. Xác thực tài khoản sẽ được bổ sung sau.");
  }

  function handleRegister(event) {
    event.preventDefault();

    if (registerData.password !== registerData.confirmPassword) {
      alert("Mật khẩu xác nhận không khớp.");
      return;
    }

    alert("Biểu mẫu đăng ký hợp lệ! Chức năng lưu tài khoản sẽ được bổ sung sau.");
  }

  const isRegister = page === "register";
  if (page === "admin") {
  return <AdminDashboard />;
}

  return (
    <div className="login-page">
      <section className="login-banner">
        <div className="brand">
          <div className="brand-icon"><HeartPulse size={27} /></div>
          <span>Patient Portal</span>
        </div>

        <div className="banner-content">
          <span className="eyebrow">YOUR HEALTH, OUR PRIORITY</span>
          <h1>Chăm sóc sức khỏe<br />bắt đầu từ đây.</h1>
          <p>
            Quản lý lịch khám, theo dõi thông tin sức khỏe
            và kết nối với đội ngũ y tế trong một nền tảng duy nhất.
          </p>
          <div className="banner-note">
            <HeartPulse size={20} />
            <span>Đồng hành cùng bạn trên hành trình khỏe mạnh.</span>
          </div>
        </div>

        <div className="banner-footer">
          PATIENT PORTAL · HEALTHCARE MANAGEMENT SYSTEM
        </div>
      </section>

      <main className="login-main">
        <div className="login-card">
          <div className="mobile-brand">
            <HeartPulse size={28} />
            <span>Patient Portal</span>
          </div>

          {isRegister && (
            <button
              type="button"
              className="back-button"
              onClick={() => setPage("login")}
            >
              <ArrowLeft size={17} /> Quay lại đăng nhập
            </button>
          )}

          <span className="form-label">
            {isRegister ? "THAM GIA CÙNG CHÚNG TÔI" : "CHÀO MỪNG BẠN"}
          </span>

          <h2>{isRegister ? "Tạo tài khoản" : "Đăng nhập"}</h2>

          <p className="form-description">
            {isRegister
              ? "Điền thông tin bên dưới để tạo tài khoản bệnh nhân."
              : "Vui lòng nhập thông tin để truy cập tài khoản của bạn."}
          </p>

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
                  onChange={(e) => setRegisterData({
                    ...registerData, fullName: e.target.value
                  })}
                  required
                />
              </div>

              <label htmlFor="registerEmail">Địa chỉ email</label>
              <div className="input-wrapper">
                <Mail size={19} />
                <input
                  id="registerEmail"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({
                    ...registerData, email: e.target.value
                  })}
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
                  onChange={(e) => setRegisterData({
                    ...registerData, phone: e.target.value
                  })}
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
                  onChange={(e) => setRegisterData({
                    ...registerData, dateOfBirth: e.target.value
                  })}
                  required
                />
              </div>

              <label htmlFor="registerPassword">Mật khẩu</label>
              <div className="input-wrapper">
                <Lock size={19} />
                <input
                  id="registerPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Tối thiểu 8 ký tự"
                  autoComplete="new-password"
                  minLength={8}
                  value={registerData.password}
                  onChange={(e) => setRegisterData({
                    ...registerData, password: e.target.value
                  })}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label="Hiện hoặc ẩn mật khẩu"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>

              <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
              <div className="input-wrapper">
                <Lock size={19} />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                  minLength={8}
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({
                    ...registerData, confirmPassword: e.target.value
                  })}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label="Hiện hoặc ẩn mật khẩu xác nhận"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword
                    ? <EyeOff size={19} />
                    : <Eye size={19} />}
                </button>
              </div>

              <button className="login-button" type="submit">
                Tạo tài khoản <ArrowRight size={19} />
              </button>

              <p className="register-prompt">
                Đã có tài khoản?{" "}
                <a href="#login" onClick={(e) => {
                  e.preventDefault();
                  setPage("login");
                }}>
                  Đăng nhập
                </a>
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <label htmlFor="email">Địa chỉ email</label>
              <div className="input-wrapper">
                <Mail size={19} />
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({
                    ...loginData, email: e.target.value
                  })}
                  required
                />
              </div>

              <div className="password-heading">
                <label htmlFor="password">Mật khẩu</label>
                <a href="#forgot-password" onClick={(e) => {
                  e.preventDefault();
                  alert("Chức năng quên mật khẩu sẽ được bổ sung sau.");
                }}>
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
                  onChange={(e) => setLoginData({
                    ...loginData, password: e.target.value
                  })}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label="Hiện hoặc ẩn mật khẩu"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>

              <button className="login-button" type="submit">
                Đăng nhập <ArrowRight size={19} />
              </button>

              <p className="register-prompt">
                Bạn chưa có tài khoản?{" "}
                <a href="#register" onClick={(e) => {
                  e.preventDefault();
                  setPage("register");
                  setShowPassword(false);
                }}>
                  Đăng ký ngay
                </a>
              </p>
            </form>
          )}

          <div className="security-note">
            <Lock size={15} />
            <span>Thông tin của bạn cần được bảo vệ an toàn.</span>
          </div>
        </div>

        <footer className="page-footer">
  © 2026 Patient Portal. Hệ thống quản lý khám bệnh.

  <div style={{ marginTop: "12px" }}>
    <button
      type="button"
      onClick={() => setPage("admin")}
      style={{
        border: "none",
        background: "transparent",
        color: "#087f8c",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: "12px",
      }}
    >
      Xem Dashboard quản trị (Demo)
    </button>
  </div>
</footer>
        
      </main>
    </div>
  );
}

export default App;
