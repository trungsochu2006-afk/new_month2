// =========================================
// 💬 4. LOGIC MẠNG XÃ HỘI PHENIKAA THREADS
// =========================================
// Chức năng: Kiểm tra đăng nhập, xác thực nội dung văn bản và hình ảnh đính kèm (có kiểm duyệt từ cấm), sau đó tạo bài đăng mới đẩy lên Firebase Database.
async function createNewPost() {
  // 1. Kiểm tra đăng nhập trước khi cho đăng bài
  let savedStudent = localStorage.getItem("current_logged_student");
  if (!savedStudent) {
    alert("Anh Trung ơi, chưa đăng nhập thì không đăng bài được đâu!");
    return;
  }
  let student = JSON.parse(savedStudent);

  let content = document.getElementById("thread-content").value.trim();
  let fileInput = document.getElementById("thread-image");

  if (!content && (!fileInput.files || fileInput.files.length === 0)) {
    alert("Nhập nội dung hoặc chọn ảnh đi m!");
    return;
  }

  if (kiemDuyetNoiDung(content)) {
    alert("⚠️ Nội dung chứa từ ngữ không phù hợp!");
    return;
  }

  let postId = "post_" + Date.now();
  let newPost = {
    id: postId,
    author: student.name,
    mssv: student.id,
    avatar: localStorage.getItem("user_avatar_base64_" + student.id) || "",
    text: content,
    image: "",
    likes: 0,
    likedUsers: {},
    comments: {},
    time: Date.now(),
  };

  // 2. Xử lý ảnh an toàn
  try {
    if (fileInput.files && fileInput.files[0]) {
      let reader = new FileReader();
      reader.onload = function (e) {
        newPost.image = e.target.result;
        database
          .ref("threads/" + postId)
          .set(newPost)
          .then(() => {
            alert("Đăng bài thành công!");
            resetKhungNhapThread();
          })
          .catch((e) => alert("Lỗi Firebase: " + e.message));
      };
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      // Không có ảnh
      database
        .ref("threads/" + postId)
        .set(newPost)
        .then(() => {
          alert("Đăng bài thành công!");
          resetKhungNhapThread();
        })
        .catch((e) => alert("Lỗi Firebase: " + e.message));
    }
  } catch (err) {
    console.error("Lỗi khi đăng bài:", err);
    alert("Có lỗi xảy ra, thử lại sau nhé!");
  }
}

// Chức năng: Nén kích thước hình ảnh dựa trên chiều rộng và chiều cao tối đa trước khi mã hóa dạng Base64 để tối ưu hóa lưu trữ.
function nenAnhThread(base64Str, maxWidth, maxHeight, callback) {
  let img = new Image();
  img.src = base64Str;
  img.onload = function () {
    let canvas = document.createElement("canvas");
    let width = img.width;
    let height = img.height;
    if (width > maxWidth || height > maxHeight) {
      if (width / height > maxWidth / maxHeight) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      } else {
        width = Math.round(width * (maxHeight / height));
        height = maxHeight;
      }
    }
    canvas.width = width;
    canvas.height = height;
    let ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);
    callback(canvas.toDataURL("image/jpeg", 0.92));
  };
}

// Chức năng: Làm sạch nội dung văn bản và tệp hình ảnh trong khung nhập liệu bài đăng mạng xã hội.
function resetKhungNhapThread() {
  document.getElementById("thread-content").value = "";
  document.getElementById("thread-image").value = "";
  let pName = document.getElementById("image-preview-name");
  if (pName) pName.innerText = "";
}

// 👑 TÁCH BIỆT HÀM RENDER COMMENT ĐỂ TRÁNH LỖI LỒNG NHAU (FIX SẬP WEB)
// Chức năng: Tạo cấu trúc HTML cho một bình luận đơn lẻ, bao gồm avatar, huy hiệu tích xanh admin, nội dung, thời gian và các nút tương tác (thích, trả lời, xóa).
function renderSingleComment(cmt, post, currentUserId, adminId) {
  let thoiGianCmt =
    typeof cmt.timestamp === "number"
      ? tinhThoiGianTroiQua(cmt.timestamp)
      : "Vừa xong";
  let cmtTichXanh = "";
  let cmtAvatarHtml = "";
  let nutXoaCmtAdmin = "";

  // Check Admin VIP chính chủ cả tên và MSSV
  let isCmtAdmin =
    cmt.user === ADMIN_INFO.name &&
    cmt.mssv &&
    cmt.mssv.trim() === ADMIN_INFO.id;
  if (isCmtAdmin) {
    cmtTichXanh = `<img src="photo/tich_xanh.jpg" alt="Tích xanh" style="width:13px; height:15px; object-fit:contain; margin-left:4px; vertical-align:middle;" />`;
  }
  let cmtAdminClass = isCmtAdmin ? "avatar-admin-vip" : "";

  if (cmt.avatar) {
    cmtAvatarHtml = `<div class="${cmtAdminClass}" style="position:relative; width:24px; height:24px; display:inline-block; margin-right:5px; vertical-align:middle;"><img src="${cmt.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" /></div>`;
  } else {
    let cmtUid = cmt.mssv ? cmt.mssv.trim() : "";
    let savedCmtAvatar = localStorage.getItem("user_avatar_base64_" + cmtUid);
    if (savedCmtAvatar) {
      cmtAvatarHtml = `<div class="${cmtAdminClass}" style="position:relative; width:24px; height:24px; display:inline-block; margin-right:5px; vertical-align:middle;"><img src="${savedCmtAvatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" /></div>`;
    } else {
      let chuCaiCmt = cmt.user ? cmt.user.charAt(0).toUpperCase() : "U";
      cmtAvatarHtml = `<div class="${cmtAdminClass}" style="position:relative; width:24px; height:24px; display:inline-block; margin-right:5px; vertical-align:middle;"><div style="width:24px; height:24px; background:#132c63; color:white; font-size:11px; font-weight:bold; border-radius:50%; display:inline-flex; align-items:center; justify-content:center;">${chuCaiCmt}</div></div>`;
    }
  }

  if (currentUserId === adminId) {
    nutXoaCmtAdmin = `<span onclick="deleteComment('${post.id}', '${cmt.key}')" style="color:#ff4d4d; font-size:11px; cursor:pointer; margin-left:10px; font-weight:bold; user-select:none;">[Xóa]</span>`;
  }

  let hasLikedCmt =
    cmt.likedUsers && Object.values(cmt.likedUsers).includes(currentUserId);
  let cmtHeartIcon = hasLikedCmt ? "❤️" : "🤍";
  let cmtLikesCount = cmt.likes || 0;
  let marginStyle = cmt.parentId
    ? "margin-left:32px; border-left:2px solid #e2e8f0; padding-left:10px;"
    : "";

  return `
            <div class="comment-item" style="padding:8px 0; text-align:left; ${marginStyle}">
              <div style="display:flex; align-items:flex-start; gap:6px;">
                ${cmtAvatarHtml}
                <div style="flex:1;">
                  <div style="background:#ffffff; padding:6px 12px; border-radius:14px; display:inline-block; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                    <b>${cmt.user}${cmtTichXanh}: </b><span style="color:#222;">${cmt.text}</span>
                  </div>
                  <div style="font-size:12px; color:#777; margin-top:4px; margin-left:8px; display:flex; align-items:center; gap:15px; user-select:none;">
                    <span>${thoiGianCmt}</span>
                    <span onclick="likeComment('${post.id}', '${cmt.key}')" style="cursor:pointer; font-weight:600;">${cmtHeartIcon} ${cmtLikesCount > 0 ? cmtLikesCount : "Thích"}</span>
                    <span onclick="kichHoatReplyComment('${post.id}', '${cmt.key}', '${cmt.user}')" style="cursor:pointer; font-weight:600; color:#254196;">Trả lời</span>
                    ${nutXoaCmtAdmin}
                  </div>
                </div>
              </div>
            </div>`;
}

// Chức năng: Lắng nghe dữ liệu bài viết thời gian thực từ Firebase, sắp xếp theo thời gian mới nhất và render toàn bộ danh sách bài đăng cùng bình luận ra giao diện
function renderThreads() {
  let container = document.getElementById("threads-list");
  if (!container) return;

  let currentUid =
    currentStudent && currentStudent.id ? currentStudent.id.trim() : "";
  const adminId = "7277979906";
  const adminName = "trung_admin";

  database.ref("threads").on("value", (snapshot) => {
    let threadsData = snapshot.val();
    container.innerHTML = "";

    if (!threadsData) {
      container.innerHTML =
        "<div style='color:#777; margin-top:20px;'>Chưa có bài đăng nào.</div>";
      return;
    }

    let posts = Object.values(threadsData).sort((a, b) => b.time - a.time);

    posts.forEach((post) => {
      // 1. XỬ LÝ QUYỀN ADMIN (Vương miện + Tích xanh)
      let isAdmin =
        post.mssv && post.mssv.trim() === adminId && post.author === adminName;
      let adminClass = isAdmin ? "avatar-admin-vip" : "";
      let tichXanhHtml = isAdmin
        ? `<img src="photo/tich_xanh.jpg" style="width: 15px; height: 15px; margin-left: 5px; vertical-align: middle;" />`
        : "";

      // 2. XỬ LÝ AVATAR
      let postAvatarHtml =
        post.avatar && post.avatar.startsWith("data:image")
          ? `<div class="thread-avatar ${adminClass}" style="overflow:hidden;"><img src="${post.avatar}" style="width:100%; height:100%; object-fit:cover;" /></div>`
          : `<div class="thread-avatar ${adminClass}">${post.author ? post.author.charAt(0).toUpperCase() : "U"}</div>`;

      // 3. XỬ LÝ THỜI GIAN (KHÔI PHỤC)
      let thoiGianHienThi =
        typeof post.time === "number"
          ? tinhThoiGianTroiQua(post.time)
          : post.time;

      // 4. XỬ LÝ COMMENTS
      let commentsHtml = "";
      if (post.comments) {
        commentsHtml = `<div class="comment-box" style="margin-top:10px; padding:10px; background:#f8f9fa; border-radius:8px;">`;
        let rawComments = Object.keys(post.comments).map((key) => ({
          key: key,
          ...post.comments[key],
        }));
        rawComments.forEach((cmt) => {
          commentsHtml += renderSingleComment(cmt, post, currentUid, adminId);
        });
        commentsHtml += `</div>`;
      }

      // 5. XỬ LÝ MENU XÓA/SỬA
      let quyen_admin = "";
      let isOwner = post.mssv && post.mssv.trim() === currentUid;
      if (isOwner || currentUid === adminId) {
        let menuItems = isOwner
          ? `<div class="muc-lua-chon-con" onclick="editPost('${post.id}')">✏️ Chỉnh sửa</div>`
          : "";
        menuItems += `<div class="muc-lua-chon-con nut-xoa-bai" onclick="deletePost('${post.id}')">🗑️ Xóa bài</div>`;
        quyen_admin = `<div class="khung-menu-bai-viet"><button class="nut-ba-cham-bai-viet" onclick="toggleThreadMenu(event, '${post.id}')">•••</button><div class="menu-lua-chon-tha-xuong" id="menu-${post.id}">${menuItems}</div></div>`;
      }

      // 6. RENDER HTML (Đã có đủ Thời gian + Avatar + Admin + Comment)
      // Thay đoạn 6 trong hàm renderThreads của anh bằng đoạn này
      let cardHtml = `
                      <div class="thread-card" id="card-${post.id}">
                          <div class="thread-user-box">
                              ${postAvatarHtml}
                              <div style="display:flex; align-items:center; gap: 8px;">
                                  <div class="thread-username" style="display:flex; align-items:center;">
                                      ${post.author || "Ẩn danh"}${tichXanhHtml}
                                  </div>
                                  <div class="thread-time" style="margin-left: 0; font-size: 13px; color: #777;">
                                      • ${thoiGianHienThi}
                                  </div>
                              </div>
                              ${quyen_admin}
                          </div>
                          <p class="thread-text">${post.text || ""}</p>
                          ${post.image ? `<img src="${post.image}" class="thread-img"/>` : ""}
                          <div class="thread-actions">
                              <div class="action-btn" onclick="likePost('${post.id}')">❤️ <span>${post.likes || 0}</span></div>
                              <div class="action-btn" onclick="focusCommentInput('${post.id}')">💬 <span>${post.comments ? Object.keys(post.comments).length : 0}</span></div>
                          </div>
                          ${commentsHtml}
                          <div style="display:flex; flex-direction: column; gap:4px; margin-top:10px;">
                              <div id="reply-status-${post.id}" style="font-size: 12px; color: #254196; display: none;"></div>
                              <div style="display:flex; gap:8px;">
                                  <input type="text" id="input-cmt-${post.id}" data-parent="" placeholder="Viết bình luận..." onkeydown="if(event.key === 'Enter') { event.preventDefault(); submitComment('${post.id}'); }" style="flex:1; padding:8px; border:1px solid #ddd; border-radius:16px; outline:none"/>
                                  <button onclick="submitComment('${post.id}')" style="background:#254196; color:white; border:none; padding:6px 12px; border-radius:16px; cursor:pointer;">Gửi</button>
                              </div>
                          </div>
                      </div>`;
      container.innerHTML += cardHtml;
    });
  });
}

// Chức năng: Xử lý thao tác thích hoặc hủy thích một bài viết mạng xã hội thông qua Firebase Transaction dựa trên ID người dùng.
function likePost(postId) {
  let currentUserId =
    currentStudent && currentStudent.id ? currentStudent.id.trim() : "guest";
  if (currentUserId === "guest") return;
  database.ref(`threads/${postId}`).transaction((post) => {
    if (post) {
      if (!post.likedUsers) post.likedUsers = {};
      let userKey = Object.keys(post.likedUsers).find(
        (key) => post.likedUsers[key] === currentUserId,
      );
      if (userKey) {
        delete post.likedUsers[userKey];
        post.likes = Math.max(0, (post.likes || 1) - 1);
      } else {
        let newLikeKey = "like_" + Date.now();
        post.likedUsers[newLikeKey] = currentUserId;
        post.likes = (post.likes || 0) + 1;
      }
    }
    return post;
  });
}

// Chức năng: Đưa con trỏ chuột tập trung vào ô nhập bình luận tương ứng của bài viết được chỉ định.
function focusCommentInput(postId) {
  let el = document.getElementById(`input-cmt-${postId}`);
  if (el) el.focus();
}

// Chức năng: Kiểm duyệt nội dung bình luận, tạo cấu trúc dữ liệu bình luận mới (hỗ trợ cả bình luận trả lời) và đẩy lên Firebase Database.
function submitComment(postId) {
  let inputEl = document.getElementById(`input-cmt-${postId}`);
  if (!inputEl) return;
  let cmtText = inputEl.value.trim();
  if (!cmtText) return;
  if (kiemDuyetNoiDung(cmtText)) {
    alert(
      "⚠️ Bình luận chứa từ ngữ không phù hợp quy chuẩn học đường Phenikaa!",
    );
    return;
  }

  let parentId = inputEl.getAttribute("data-parent") || "";
  let currentUser =
    currentStudent && currentStudent.name
      ? currentStudent.name
      : "Sinh viên ẩn danh";
  let currentUid =
    currentStudent && currentStudent.id ? currentStudent.id.trim() : "";

  let newComment = {
    id: "cmt_" + Date.now(),
    user: currentUser,
    mssv: currentUid,
    avatar: localStorage.getItem("user_avatar_base64_" + currentUid) || "",
    text: cmtText,
    timestamp: Date.now(),
    parentId: parentId,
  };
  database
    .ref(`threads/${postId}/comments`)
    .push(newComment)
    .then(() => {
      inputEl.value = "";
      huyReplyComment(postId);
    });
}

// Chức năng: Ẩn/hiện menu tùy chọn thả xuống (xóa/sửa) của bài viết khi người dùng nhấn vào nút ba chấm.
function toggleThreadMenu(event, postId) {
  event.stopPropagation();
  document.querySelectorAll(".menu-lua-chon-tha-xuong").forEach((menu) => {
    if (menu.id !== `menu-${postId}`) menu.classList.remove("hien-thi");
  });
  let targetMenu = document.getElementById(`menu-${postId}`);
  if (targetMenu) targetMenu.classList.toggle("hien-thi");
}

window.deletePost = function (postId) {
  if (!postId) return;
  if (confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
    // Thêm kiểm tra database tồn tại trước khi xóa
    if (typeof database !== "undefined") {
      database
        .ref("threads/" + postId)
        .remove()
        .then(() => alert("Đã xóa bài!"))
        .catch((err) => alert("Lỗi khi xóa: " + err.message));
    }
  }
};
function deleteComment(postId, cmtKey) {
  let currentUid = currentStudent.id ? currentStudent.id.trim() : "";
  const adminId = "7277979906";

  // Admin thì cho xóa, hoặc nếu là chủ bình luận đó thì cho xóa
  if (
    currentUid === adminId ||
    confirm("Bạn có chắc muốn xóa bình luận này?")
  ) {
    database.ref(`threads/${postId}/comments/${cmtKey}`).remove();
  } else {
    alert("Bạn không có quyền xóa bình luận này!");
  }
}

// Chức năng: Thay thế nội dung văn bản bài viết bằng khung chỉnh sửa văn bản (textarea) để người dùng có thể cập nhật lại bài đăng của mình.
function editPost(postId) {
  let textElement = document.getElementById(`text-${postId}`);
  if (!textElement) return;
  let currentText = textElement.innerText;
  textElement.innerHTML = `
            <div style="margin-top: 10px;">
              <textarea id="edit-input-${postId}" style="width: 100%; height: 60px; padding: 8px; border: 1px solid #005da3; border-radius: 6px; outline: none; resize: none; font-family: inherit; font-size: 14px; box-sizing: border-box;">${currentText}</textarea>
              <div style="text-align: right; margin-top: 5px;">
                <button onclick="cancelEdit('${postId}', \`${currentText}\`)" style="background: #6c757d; color: white; border: none; padding: 4px 12px; border-radius: 12px; font-size: 12px; cursor: pointer; margin-right: 5px;">Hủy</button>
                <button onclick="saveEditPost('${postId}')" style="background: #28a745; color: white; border: none; padding: 4px 12px; border-radius: 12px; font-size: 12px; cursor: pointer; font-weight: bold;">Lưu lại</button>
              </div>
            </div>`;
}

// Chức năng: Hủy bỏ quá trình chỉnh sửa bài viết và khôi phục lại nội dung văn bản ban đầu.
function cancelEdit(postId, originalText) {
  let textElement = document.getElementById(`text-${postId}`);
  if (textElement) textElement.innerText = originalText;
}

// Chức năng: Lấy nội dung mới từ khung chỉnh sửa bài viết và cập nhật dữ liệu trực tiếp lên Firebase Database.
function saveEditPost(postId) {
  let inputEl = document.getElementById(`edit-input-${postId}`);
  if (!inputEl) return;
  let newContent = inputEl.value.trim();
  if (!newContent) {
    alert("Nội dung không được để trống!");
    return;
  }
  database.ref(`threads/${postId}/text`).set(newContent);
}

// Chức năng: Quy đổi một mốc thời gian dạng timestamp thành chuỗi hiển thị khoảng thời gian trôi qua thân thiện (ví dụ: vài phút trước, vài giờ trước).
function tinhThoiGianTroiQua(timestamp) {
  if (!timestamp) return "Vừa xong";
  let bayGio = Date.now();
  let chenhLech = Math.floor((bayGio - timestamp) / 1000);
  if (chenhLech < 60) return "Vừa xong";
  let phut = Math.floor(chenhLech / 60);
  if (phut < 60) return phut + " phút trước";
  let gio = Math.floor(phut / 60);
  if (gio < 24) return gio + " giờ trước";
  let ngay = Math.floor(gio / 24);
  if (ngay < 30) return ngay + " ngày trước";
  let thang = Math.floor(ngay / 30);
  return thang + " tháng trước";
}
