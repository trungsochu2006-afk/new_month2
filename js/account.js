let currentStudent = { name: "", id: "" };
// Sự kiện DOMContentLoaded chuẩn hóa
document.addEventListener("DOMContentLoaded", function () {
  let savedStudent = localStorage.getItem("current_logged_student");
  if (savedStudent) {
    currentStudent = JSON.parse(savedStudent);
    let welcomeScreen = document.getElementById("welcome-screen");
    if (welcomeScreen) welcomeScreen.style.display = "none";
  }

  hienThiGiaoDienTaiKhoan();

  let fileInput = document.getElementById("thread-image");
  if (fileInput) {
    fileInput.addEventListener("change", function () {
      let pName = document.getElementById("image-preview-name");
      if (this.files && this.files[0]) {
        pName.innerText = "📎 Đã chọn: " + this.files[0].name;
      } else {
        pName.innerText = "";
      }
    });
  }
  renderThreads();
});
// Chức năng: Xác thực thông tin họ tên và mã số sinh viên, lưu trữ vào localStorage, cập nhật giao diện tài khoản và kích hoạt trạng thái trực tuyến.
function submitStudentInfo() {
  let nameInput = document.getElementById("student-name").value.trim();
  let idInput = document.getElementById("student-id").value.trim();

  // 1. Kiểm tra trước, nếu sai thì chặn luôn không cho làm gì cả
  if (nameInput === "" || idInput === "") {
    alert(
      "Vui lòng nhập đầy đủ Họ tên và Mã số sinh viên trước khi vào học nhé!",
    );
    return;
  }

  // 2. Gán dữ liệu vào object rồi mới làm tiếp
  currentStudent.name = nameInput;
  currentStudent.id = idInput;

  // 3. Lưu localStorage
  localStorage.setItem(
    "current_logged_student",
    JSON.stringify(currentStudent),
  );

  // 4. Cập nhật giao diện và ẩn màn hình đăng nhập
  hienThiGiaoDienTaiKhoan();
  document.getElementById("welcome-screen").style.display = "none";

  // 5. GỌI HÀM ONLINE VÀ RENDER SAU KHI ĐÃ CÓ DỮ LIỆU CHÍNH XÁC
  updateOnlineStatus();
  renderThreads();
}
