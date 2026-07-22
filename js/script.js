// =========================================
// 👑 1. KHAI BÁO BIẾN CỐ ĐỊNH & ADMIN INFO
// =========================================
const shopeeLink = "https://s.shopee.vn/8V3Q7Nm1he";

// Chức năng: Kích hoạt chế độ trả lời bình luận (reply) cho một bình luận cụ thể, hiển thị khung trạng thái và gắn tên người được tag vào ô nhập liệu.
window.kichHoatReplyComment = function (postId, cmtKey, username) {
  let inputEl = document.getElementById(`input-cmt-${postId}`);
  let statusEl = document.getElementById(`reply-status-${postId}`);
  if (inputEl && statusEl) {
    inputEl.setAttribute("data-parent", cmtKey);
    inputEl.value = `@${username} `;
    statusEl.style.display = "block";
    statusEl.innerHTML = `Đang trả lời bình luận của <b>${username}</b> <span onclick="huyReplyComment('${postId}')" style="color:#ff4d4d; cursor:pointer; margin-left:8px; font-weight:bold;">[Hủy]</span>`;
    inputEl.focus();
  }
};
// Chức năng: Hủy bỏ chế độ trả lời bình luận, ẩn khung trạng thái và xóa dữ liệu bình luận cha (parent ID) đang chọn.
window.huyReplyComment = function (postId) {
  let inputEl = document.getElementById(`input-cmt-${postId}`);
  let statusEl = document.getElementById(`reply-status-${postId}`);
  if (inputEl && statusEl) {
    inputEl.setAttribute("data-parent", "");
    inputEl.value = "";
    statusEl.style.display = "none";
  }
};
// Chức năng: Xử lý sự kiện thích hoặc hủy thích một bình luận bằng Firebase Transaction dựa trên định danh của người dùng hiện tại.
function likeComment(postId, cmtKey) {
  let currentUserId =
    currentStudent && currentStudent.id ? currentStudent.id.trim() : "guest";
  if (currentUserId === "guest") return;

  let cmtRef = database.ref(`threads/${postId}/comments/${cmtKey}`);
  cmtRef.transaction((cmt) => {
    if (cmt) {
      if (!cmt.likedUsers) cmt.likedUsers = {};
      let userKey = Object.keys(cmt.likedUsers).find(
        (key) => cmt.likedUsers[key] === currentUserId,
      );
      if (userKey) {
        delete cmt.likedUsers[userKey];
        cmt.likes = Math.max(0, (cmt.likes || 1) - 1);
      } else {
        let newLikeCmtKey = "like_" + Date.now();
        cmt.likedUsers[newLikeCmtKey] = currentUserId;
        cmt.likes = (cmt.likes || 0) + 1;
      }
    }
    return cmt;
  });
}
// Chức năng: Quản lý việc ẩn hiện các section giao diện chính, tự động ẩn/hiện banner trang chủ và dọn dẹp âm thanh trắc nghiệm khi chuyển tab.
function showTab(tab) {
  // 1. Logic ẩn hiện nội dung tab (giữ nguyên của anh)
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  let target = document.getElementById(tab);
  if (target) target.classList.add("active");

  // 2. LOGIC TỰ ĐỘNG ẨN BANNER KHI CHUYỂN TAB
  const bannerPC = document.getElementById("carousel-container-pc");
  const bannerMobile = document.getElementById("carousel-container-mobile");

  if (tab === "home") {
    // Nếu là trang chủ thì hiện lại banner
    if (bannerPC) bannerPC.style.display = "block";
    if (bannerMobile) bannerMobile.style.display = "block";
  } else {
    // Nếu là tab khác (Quiz, Thread, Shop) thì ẩn banner đi
    if (bannerPC) bannerPC.style.display = "none";
    if (bannerMobile) bannerMobile.style.display = "none";
  }
}
// Chức năng: Lọc và tìm kiếm các thẻ tin tức dựa trên từ khóa nhập vào từ ô tìm kiếm người dùng.
function searchNews() {
  let keyword = document.getElementById("newsSearch").value.toLowerCase();
  document.querySelectorAll(".news").forEach((card) => {
    card.style.display = card.innerText.toLowerCase().includes(keyword)
      ? "block"
      : "none";
  });
}

const modal = document.getElementById("videoModal");
const video = document.getElementById("videoPlayer");
const overlay = document.getElementById("overlay");

document.querySelectorAll(".news").forEach((card) => {
  card.onclick = () => {
    video.src = card.dataset.video;
    video.load();
    modal.style.display = "flex";
    overlay.style.display = "flex";
    video.pause();
  };
});
// Chức năng: Tạm dừng phát video overlay, ẩn lớp phủ và mở liên kết sàn thương mại điện tử Shopee trong một tab mới.
function goShopee() {
  overlay.style.display = "none";
  video.play();
  window.open(shopeeLink, "_blank");
}

document.addEventListener("visibilitychange", function () {
  if (!document.hidden) {
    if (overlay.style.display === "none" && modal.style.display === "flex") {
      video.play();
    }
  }
});
// Chức năng: Đóng cửa sổ video modal, đặt lại thời gian phát video về 0 và chuyển hướng người dùng về tab trang chủ.
function closeVideo() {
  video.pause();
  video.currentTime = 0;
  overlay.style.display = "none";
  modal.style.display = "none";
  showTab("home");
}
// =========================================
// 📝 LOGIC HỆ THỐNG TRẮC NGHIỆM (QUIZ) ĐÃ CẬP NHẬT NỘP SỚM & ÂM THANH
// =========================================
let selectedSubject = "";
let selectedChapter = "";
let questionsPool = [];
let userResponses = {};
let wrongQuestionsQueue = [];
let isRepeatMode = false;
let currentQuestionIdx = 0;
let correctAnswersSet = new Set();
let quizStartTime = 0;

const correctSound = new Audio("audio/dung.mp3");
const tenPointsSound = new Audio("audio/10diem.mp3"); // 🌟 Nhạc dành riêng cho 10 điểm tuyệt đối
const highSound = new Audio("audio/kinh.mp3"); // 8den10
const mediumSound = new Audio("audio/aiep.mp3"); // 5 den 8
const lowSound = new Audio("audio/lay10lay.mp3"); // Dành 3den5
const earlySubmitSound = new Audio("audio/taolaymay.mp3"); // 🌟 0 den 3

const wrongSound = new Audio("audio/danhram.mp3");
const countdownSound = new Audio("audio/colen.mp3");

countdownSound.addEventListener("timeupdate", function () {
  if (this.currentTime >= 4.0) {
    this.pause();
    this.currentTime = 0;
  }
});

function showQuizSubTab(subTabId) {
  document
    .querySelectorAll(".quiz-sub-tab")
    .forEach((tab) => (tab.style.display = "none"));
  document.getElementById(subTabId).style.display = "block";
}
// Chức năng: Tự động quét từ Chương 1 đến Chương 10, kiểm tra dữ liệu và hiển thị danh sách các chương có sẵn câu hỏi của môn học được chọn.
function selectSubject(subjectName) {
  selectedSubject = subjectName;
  document.getElementById("chapters-title").innerText =
    `MÔN: ${subjectName.toUpperCase()}`;

  let chapterListContainer = document.querySelector(".chapter-list");
  if (chapterListContainer && quizDatabase[subjectName]) {
    chapterListContainer.innerHTML = ""; // Xóa danh sách cũ
    let chaptersData = quizDatabase[subjectName];
    let count = 0;

    // Vòng lặp giới hạn tối đa 10 chương
    for (let i = 1; i <= 10; i++) {
      let chapterKey = `Chương ${i}`;
      // Điều kiện: Chương phải tồn tại và có ít nhất 1 câu hỏi bên trong mới cho hiện nút
      if (chaptersData[chapterKey] && chaptersData[chapterKey].length > 0) {
        let btn = document.createElement("button");
        btn.className = "quiz-btn";
        btn.innerText = chapterKey;
        btn.onclick = function () {
          selectChapter(chapterKey);
        };
        chapterListContainer.appendChild(btn);
        count++;
      }
    }

    // Nếu môn đó hoàn toàn chưa có chương nào có câu hỏi
    if (count === 0) {
      chapterListContainer.innerHTML = `<div style="color:#777; text-align:center; padding:10px;">Chưa có chương nào có câu hỏi!</div>`;
    }
  }

  showQuizSubTab("quiz-chapters");
}

// Chức năng: Tắt toàn bộ âm thanh trắc nghiệm đang phát và quay trở lại màn hình chọn môn học.
function backToSubjects() {
  tatTatCaNhacQuiz();
  showQuizSubTab("quiz-subjects");
}

// Chức năng: Bốc đúng bộ câu hỏi của chương học được chọn từ kho dữ liệu hoặc thiết lập thông báo cập nhật nếu chưa có câu hỏi.
function selectChapter(chapterName) {
  selectedChapter = chapterName;

  if (
    quizDatabase[selectedSubject] &&
    quizDatabase[selectedSubject][selectedChapter]
  ) {
    originalQuestions = quizDatabase[selectedSubject][selectedChapter];
  } else {
    originalQuestions = [
      {
        q: "Chương này đang cập nhật câu hỏi...",
        options: {
          A: "Đang cập nhật",
          B: "Đang cập nhật",
          C: "Đang cập nhật",
          D: "Đang cập nhật",
        },
        answer: "A",
      },
    ];
  }

  demnguoc(); // Bắt đầu đếm ngược 3 giây vào bài thi
}

// Chức năng: Dừng âm thanh trắc nghiệm và điều hướng quay trở lại màn hình danh sách các chương của môn học.
function backToChapters() {
  tatTatCaNhacQuiz();
  showQuizSubTab("quiz-chapters");
}

// Chức năng: Hiển thị giao diện đếm ngược 3 giây trước khi bước vào bài thi chính thức kèm âm thanh đếm ngược.
function demnguoc() {
  showQuizSubTab("quiz-countdown");
  let exitBox = document.getElementById("emergency-exit-box");
  if (exitBox) exitBox.style.display = "block"; // Hiện nút Nộp bài sớm khi làm bài

  let count = 3;
  const timerEl = document.getElementById("countdown-timer");
  timerEl.innerText = count;
  countdownSound.currentTime = 0;
  countdownSound.play().catch(() => {});
  let interval = setInterval(() => {
    count--;
    if (count > 0) {
      timerEl.innerText = count;
    } else {
      clearInterval(interval);
      initQuizGame();
    }
  }, 1000);
}

// Chức năng: Khởi tạo bộ câu hỏi xáo trộn ngẫu nhiên (shuffle), reset các biến trạng thái, thời gian bắt đầu và bắt đầu phiên làm bài trắc nghiệm.
function initQuizGame() {
  let exitBox = document.getElementById("emergency-exit-box");
  if (exitBox) exitBox.style.display = "block";

  questionsPool = JSON.parse(JSON.stringify(originalQuestions));
  for (let i = questionsPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questionsPool[i], questionsPool[j]] = [questionsPool[j], questionsPool[i]];
  }
  questionsPool.forEach((q, idx) => {
    q.id = idx;
  });
  userResponses = {};
  wrongQuestionsQueue = [];
  correctAnswersSet.clear();
  isRepeatMode = false;
  currentQuestionIdx = 0;
  quizStartTime = Date.now();
  showQuizSubTab("quiz-play");
  updateLiveScoreBar();
  renderQuestion();
}

// Chức năng: Tính toán và cập nhật điểm số trực tiếp cùng thống kê số câu đúng trên tổng số câu hỏi theo thời gian thực.
function updateLiveScoreBar() {
  const totalQ = originalQuestions.length;
  const correctCount = correctAnswersSet.size;
  let liveScore = correctCount * (10 / totalQ);
  document.getElementById("live-score-val").innerText = (
    Math.round(liveScore * 100) / 100
  ).toFixed(2);
  document.getElementById("live-stats-val").innerText =
    `(${correctCount}/${totalQ})`;
}

// Chức năng: Hiển thị nội dung câu hỏi hiện tại, các lựa chọn đáp án A, B, C, D và trạng thái làm bài lên giao diện.
function renderQuestion() {
  let activeList = isRepeatMode ? wrongQuestionsQueue : questionsPool;
  let totalQuestions = activeList.length;
  if (totalQuestions === 0) {
    ketthucbaithi();
    return;
  }
  let currentQ = activeList[currentQuestionIdx];
  document.getElementById("question-index").innerText =
    `Câu hỏi: ${currentQuestionIdx + 1} / ${totalQuestions}`;
  document.getElementById("quiz-temp-status").innerText = isRepeatMode
    ? "Đang sửa lại câu sai..."
    : "Lượt làm chính";
  document.getElementById("question-text").innerText = currentQ.q;
  document.getElementById("optA").innerText = `A. ${currentQ.options.A}`;
  document.getElementById("optB").innerText = `B. ${currentQ.options.B}`;
  document.getElementById("optC").innerText = `C. ${currentQ.options.C}`;
  document.getElementById("optD").innerText = `D. ${currentQ.options.D}`;
  ["A", "B", "C", "D"].forEach((opt) => {
    const btn = document.getElementById(`opt${opt}`);
    btn.className = "answer-option";
    btn.disabled = false;
  });
  if (userResponses[currentQ.id] !== undefined) {
    showAnswerStatus(currentQ, userResponses[currentQ.id]);
  }
  document.getElementById("prev-btn").disabled = currentQuestionIdx === 0;
}

// Chức năng: Xử lý đáp án người dùng chọn, kiểm tra đúng/sai, cộng trừ điểm số, phát âm thanh tương ứng và hiển thị màu sắc trạng thái đáp án.
function answerQuestion(selectedOption) {
  let activeList = isRepeatMode ? wrongQuestionsQueue : questionsPool;
  let currentQ = activeList[currentQuestionIdx];
  if (userResponses[currentQ.id] !== undefined) return;
  userResponses[currentQ.id] = selectedOption;
  if (selectedOption === currentQ.answer) {
    correctAnswersSet.add(currentQ.id);
    correctSound.currentTime = 0;
    correctSound.play().catch(() => {});
  } else {
    correctAnswersSet.delete(currentQ.id);
    wrongSound.currentTime = 0;
    wrongSound.play().catch(() => {});
  }
  updateLiveScoreBar();
  showAnswerStatus(currentQ, selectedOption);
}

// Chức năng: Khóa các nút lựa chọn đáp án sau khi đã chọn, đồng thời tô màu chỉ rõ đáp án đúng và đáp án người dùng đã chọn.
function showAnswerStatus(questionObj, chosenOption) {
  ["A", "B", "C", "D"].forEach((opt) => {
    const btn = document.getElementById(`opt${opt}`);
    btn.disabled = true;
    if (opt === questionObj.answer) btn.classList.add("correct");
    else if (opt === chosenOption) btn.classList.add("wrong");
  });
}

// Chức năng: Di chuyển lùi lại câu hỏi trước đó trong danh sách nếu chưa ở câu đầu tiên.
function prevQuestion() {
  if (currentQuestionIdx > 0) {
    currentQuestionIdx--;
    renderQuestion();
  }
}

// Chức năng: Chuyển sang câu hỏi tiếp theo trong danh sách hoặc kích hoạt chu trình kiểm tra câu trả lời sai.
function nextQuestion() {
  let activeList = isRepeatMode ? wrongQuestionsQueue : questionsPool;
  if (currentQuestionIdx < activeList.length - 1) {
    currentQuestionIdx++;
    renderQuestion();
  } else {
    autoCheckAndLoopCycle();
  }
}

// Chức năng: Tự động gom các câu trả lời sai vào hàng đợi luyện tập lại (repeat mode) hoặc gọi hàm kết thúc bài thi nếu đã đúng hết.
function autoCheckAndLoopCycle() {
  if (!isRepeatMode) {
    let failedQuestions = [];
    questionsPool.forEach((q) => {
      if (!correctAnswersSet.has(q.id)) failedQuestions.push(q);
    });
    if (failedQuestions.length > 0) {
      isRepeatMode = true;
      wrongQuestionsQueue = failedQuestions;
      wrongQuestionsQueue.forEach((q) => {
        delete userResponses[q.id];
      });
      currentQuestionIdx = 0;
      renderQuestion();
    } else {
      ketthucbaithi();
    }
  } else {
    let failedAgain = [];
    wrongQuestionsQueue.forEach((q) => {
      if (!correctAnswersSet.has(q.id)) failedAgain.push(q);
    });
    if (failedAgain.length > 0) {
      wrongQuestionsQueue = failedAgain;
      wrongQuestionsQueue.forEach((q) => {
        delete userResponses[q.id];
      });
      currentQuestionIdx = 0;
      renderQuestion();
    } else {
      ketthucbaithi();
    }
  }
}

// 🌟 HÀM KẾT THÚC HOẶC NỘP SỚM BÀI THI
// Chức năng: Tính toán thời gian hoàn thành, lưu kết quả lên bảng xếp hạng, phân loại điểm số để phát các hiệu ứng âm thanh đặc trưng theo dải điểm và hiển thị màn hình tổng kết.
function ketthucbaithi() {
  let totalDurationSeconds = Math.round((Date.now() - quizStartTime) / 1000);
  saveToLeaderboard(totalDurationSeconds);

  let exitBox = document.getElementById("emergency-exit-box");
  if (exitBox) exitBox.style.display = "none";

  showQuizSubTab("quiz-result");

  const totalQ = originalQuestions.length;
  const correctCount = correctAnswersSet.size;
  let finalScore =
    totalQ > 0 ? Math.round(correctCount * (10 / totalQ) * 100) / 100 : 0;

  document.getElementById("score-text").innerText =
    `${finalScore.toFixed(2)} / 10 Điểm`;

  // 🌟 DỪNG TẤT CẢ NHẠC CŨ TRƯỚC KHI PHÁT NHẠC MỚI
  tatTatCaNhacQuiz();

  // 🌟 PHÂN LOẠI ÂM THANH VÀ THÔNG BÁO DỰA TRÊN DẢI ĐIỂM THỰC TẾ (GIỮ NGUYÊN 100% LOGIC CŨ VÀ MỞ RỘNG)
  if (finalScore === 10) {
    // 10 điểm tuyệt đối: Phát nhạc 10diem.mp3
    tenPointsSound.currentTime = 0;
    tenPointsSound.play().catch(() => {});

    document.querySelector(".result-screen .mauchuquizi").innerText =
      "Ô MAI CA ĐÚNG HẾT RỒI KÌA";
    document.getElementById("summary-text").innerHTML =
      `Chúc mừng học viên: <b>${currentStudent.name}</b> (MSSV: ${currentStudent.id})!<br>Bạn đã hoàn thành chính xác 100% tất cả các câu hỏi của <b>${selectedChapter}</b> - <b>${selectedSubject}</b>.<br>Thời gian hoàn thành: <b>${totalDurationSeconds} giây</b>.`;
  } else if (finalScore >= 8 && finalScore < 10) {
    // Từ 8 đến dưới 10 điểm: Phát nhạc cao (ví dụ dùng earlySubmitSound hoặc nhạc riêng nếu có)
    if (typeof highSound !== "undefined") {
      highSound.currentTime = 0;
      highSound.play().catch(() => {});
    } else {
      earlySubmitSound.currentTime = 0;
      earlySubmitSound.play().catch(() => {});
    }

    document.querySelector(".result-screen .mauchuquizi").innerText =
      "XUẤT SẮC QUÁ ĐI MẤT!";
    document.getElementById("summary-text").innerHTML =
      `Học viên: <b>${currentStudent.name}</b> (MSSV: ${currentStudent.id}) đã hoàn thành bài.<br>Số câu đúng: <b>${correctCount}/${totalQ} câu</b> (${finalScore.toFixed(2)} điểm).<br>Thời gian làm bài: <b>${totalDurationSeconds} giây</b>.`;
  } else if (finalScore >= 5 && finalScore < 8) {
    // Từ 5 đến dưới 8 điểm: Phát nhạc trung bình
    if (typeof mediumSound !== "undefined") {
      mediumSound.currentTime = 0;
      mediumSound.play().catch(() => {});
    } else {
      earlySubmitSound.currentTime = 0; //
      earlySubmitSound.play().catch(() => {});
    }

    document.querySelector(".result-screen .mauchuquizi").innerText =
      "LÀM TỐT LẮM, CỐ CHÚT NỮA NHÉ";
    document.getElementById("summary-text").innerHTML =
      `Học viên: <b>${currentStudent.name}</b> (MSSV: ${currentStudent.id}) đã nộp bài.<br>Số câu đúng: <b>${correctCount}/${totalQ} câu</b> (${finalScore.toFixed(2)} điểm).<br>Thời gian làm bài: <b>${totalDurationSeconds} giây</b>.`;
  } else if (finalScore >= 3 && finalScore < 5) {
    // Từ 3 đến dưới 5 điểm: Phát nhạc thấp / cảnh báo
    if (typeof lowSound !== "undefined") {
      lowSound.currentTime = 0;
      lowSound.play().catch(() => {});
    } else {
      wrongSound.currentTime = 0; // pẹt pẹt
      wrongSound.play().catch(() => {});
    }

    document.querySelector(".result-screen .mauchuquizi").innerText =
      "LẦN SAU CỐ GẮNG HƠN NHÉ";
    document.getElementById("summary-text").innerHTML =
      `Học viên: <b>${currentStudent.name}</b> (MSSV: ${currentStudent.id}) đã nộp bài.<br>Số câu đúng: <b>${correctCount}/${totalQ} câu</b> (${finalScore.toFixed(2)} điểm).<br>Thời gian làm bài: <b>${totalDurationSeconds} giây</b>.`;
  } else {
    // Dưới 3 điểm (hoặc 0 điểm / nộp sớm):
    earlySubmitSound.currentTime = 0;
    earlySubmitSound.play().catch(() => {});

    document.querySelector(".result-screen .mauchuquizi").innerText =
      "LẦN SAU CỐ GẮNG HƠN NHÉ";
    document.getElementById("summary-text").innerHTML =
      `Học viên: <b>${currentStudent.name}</b> (MSSV: ${currentStudent.id}) đã nộp bài.<br>Số câu đúng: <b>${correctCount}/${totalQ} câu</b> (${finalScore.toFixed(2)} điểm).<br>Thời gian làm bài: <b>${totalDurationSeconds} giây</b>.`;
  }
}

// Chức năng: Hiển thị hộp thoại xác nhận nộp bài sớm, dừng âm thanh đếm ngược và tiến hành kết thúc bài thi.
function nopBaiSom() {
  if (confirm("Bạn có chắc chắn muốn nộp bài sớm và xem kết quả không?")) {
    tatTatCaNhacQuiz();
    ketthucbaithi();
  }
}

// Chức năng: Tạm dừng và đặt lại thời gian về 0 cho tất cả các tệp âm thanh đang phát liên quan đến trắc nghiệm.
function tatTatCaNhacQuiz() {
  if (typeof tenPointsSound !== "undefined") {
    tenPointsSound.pause();
    tenPointsSound.currentTime = 0;
  }
  if (typeof earlySubmitSound !== "undefined") {
    earlySubmitSound.pause();
    earlySubmitSound.currentTime = 0;
  }
  if (typeof countdownSound !== "undefined") {
    countdownSound.pause();
    countdownSound.currentTime = 0;
  }
}

// Tự động tắt nhạc khi rời khỏi tab trắc nghiệm hoặc chuyển trang
function showTab(tab) {
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  let target = document.getElementById(tab);
  if (target) target.classList.add("active");

  // Nếu không ở tab quiz thì tắt sạch nhạc quiz đang phát
  if (tab !== "quiz") {
    tatTatCaNhacQuiz();
    let exitBox = document.getElementById("emergency-exit-box");
    if (exitBox) exitBox.style.display = "none";
  }

  const bannerPC = document.getElementById("carousel-container-pc");
  const bannerMobile = document.getElementById("carousel-container-mobile");

  if (tab === "home") {
    if (bannerPC) bannerPC.style.display = "block";
    if (bannerMobile) bannerMobile.style.display = "block";
  } else {
    if (bannerPC) bannerPC.style.display = "none";
    if (bannerMobile) bannerMobile.style.display = "none";
  }
}
// Chức năng: Lưu trữ hoặc cập nhật thành tích điểm số và thời gian làm bài của học viên vào LocalStorage để làm bảng xếp hạng.
function saveToLeaderboard(duration) {
  let data = localStorage.getItem("quiz_leaderboard");
  let leaderboard = data ? JSON.parse(data) : [];

  let correctCount = correctAnswersSet.size;
  let totalQ = originalQuestions.length;
  let currentScore = Math.round(correctCount * (10 / totalQ) * 100) / 100;

  let existingRecordIndex = leaderboard.findIndex(
    (item) =>
      item.id === currentStudent.id &&
      item.subject === selectedSubject &&
      item.chapter === selectedChapter,
  );

  if (existingRecordIndex !== -1) {
    let oldRecord = leaderboard[existingRecordIndex];
    let oldScore = oldRecord.score !== undefined ? oldRecord.score : 10;

    if (
      currentScore > oldScore ||
      (currentScore === oldScore && duration < oldRecord.duration)
    ) {
      leaderboard[existingRecordIndex].duration = duration;
      leaderboard[existingRecordIndex].score = currentScore;
      leaderboard[existingRecordIndex].correctCount = correctCount;
      leaderboard[existingRecordIndex].timestamp = Date.now();
    }
  } else {
    leaderboard.push({
      name: currentStudent.name,
      id: currentStudent.id,
      subject: selectedSubject,
      chapter: selectedChapter,
      duration: duration,
      score: currentScore,
      correctCount: correctCount,
      timestamp: Date.now(),
    });
  }
  localStorage.setItem("quiz_leaderboard", JSON.stringify(leaderboard));
}

// Chức năng: Lọc, sắp xếp dữ liệu bảng xếp hạng theo điểm số và thời gian của môn học hiện tại, sau đó hiển thị danh sách lên giao diện.
function showLeaderboardTab() {
  document.getElementById("leaderboard-title").innerText =
    `BẢNG XẾP HẠNG MÔN: ${selectedSubject.toUpperCase()}`;

  let data = localStorage.getItem("quiz_leaderboard");
  let leaderboard = data ? JSON.parse(data) : [];
  let subjectFiltered = leaderboard.filter(
    (item) => item.subject === selectedSubject,
  );

  // Sắp xếp: Điểm cao trước, nếu bằng điểm thì xét thời gian nhanh hơn
  subjectFiltered.sort((a, b) => {
    let scoreA = a.score !== undefined ? a.score : 10;
    let scoreB = b.score !== undefined ? b.score : 10;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return a.duration - b.duration;
  });

  let tbody = document.getElementById("leaderboard-data");
  tbody.innerHTML = "";

  if (subjectFiltered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#777;">Chưa có dữ liệu xếp hạng cho môn này!</td></tr>`;
  } else {
    subjectFiltered.forEach((student, index) => {
      let mssvBaoMat = student.id ? student.id.substring(0, 3) + "***" : "";
      let diemSo = student.score !== undefined ? student.score : "10.00";
      let soCau =
        student.correctCount !== undefined
          ? student.correctCount
          : originalQuestions.length;

      tbody.innerHTML += `<tr>
              <td><b>${index + 1}</b></td>
              <td>${student.name}</td>
              <td>${mssvBaoMat}</td>
              <td><span style="color:#0058f0; font-weight:bold;">${diemSo}đ</span> (${soCau}/${originalQuestions.length} câu)</td>
              <td><span style="color:#28a745; font-weight:bold;">${student.duration} giây</span> (${student.chapter})</td>
            </tr>`;
    });
  }
  showQuizSubTab("quiz-leaderboard");
}

// Chức năng: Tắt âm thanh và điều hướng người dùng quay lại màn hình kết quả hoặc danh sách chương tùy thuộc vào trạng thái hoàn thành bài thi.
function goBackFromLeaderboard() {
  tatTatCaNhacQuiz();
  let exitBox = document.getElementById("emergency-exit-box");
  if (exitBox) exitBox.style.display = "none";

  if (
    correctAnswersSet.size === originalQuestions.length &&
    document.getElementById("quiz-result").style.display === "block"
  ) {
    showQuizSubTab("quiz-result");
  } else {
    showQuizSubTab("quiz-chapters");
  }
}

// Chức năng: Dừng âm thanh hiện tại và khởi động lại quá trình đếm ngược để làm lại bài thi từ đầu.
function restartQuiz() {
  tatTatCaNhacQuiz();
  demnguoc();
}

// Chức năng: Thoát khẩn cấp khỏi bài thi, dọn dẹp toàn bộ dữ liệu trạng thái tạm thời và đưa người dùng về giao diện chọn môn học chính.
function emergencyExit() {
  tatTatCaNhacQuiz();
  let exitBox = document.getElementById("emergency-exit-box");
  if (exitBox) exitBox.style.display = "none";
  isRepeatMode = false;
  wrongQuestionsQueue = [];
  correctAnswersSet.clear();
  userResponses = {};
  currentQuestionIdx = 0;
  showTab("quiz");
  showQuizSubTab("quiz-subjects");
}

// Chức năng: Ẩn/hiện menu thả xuống thông tin tài khoản người dùng góc màn hình và nạp dữ liệu hiện tại vào các ô chỉnh sửa.
function toggleUserMenu(event) {
  event.stopPropagation();
  let menu = document.getElementById("menu-tha-tai-khoan");
  if (menu) {
    menu.classList.toggle("hien-thi-user");
    if (menu.classList.contains("hien-thi-user")) {
      if (document.getElementById("menu-input-ten")) {
        document.getElementById("menu-input-ten").value =
          currentStudent.name || "";
        document.getElementById("menu-input-ten").onclick = function (e) {
          e.stopPropagation();
        };
      }
      if (document.getElementById("menu-input-mssv")) {
        document.getElementById("menu-input-mssv").value =
          currentStudent.id || "";
        document.getElementById("menu-input-mssv").onclick = function (e) {
          e.stopPropagation();
        };
      }
    }
  }
}

document.addEventListener("click", function () {
  let menu = document.getElementById("menu-tha-tai-khoan");
  if (menu) menu.classList.remove("hien-thi-user");
});

// =========================================
// 👤 5. ĐỒNG BỘ TÀI KHOẢN VÀ AVATAR
// =========================================
// Chức năng: Tải và hiển thị ảnh đại diện hoặc chữ cái đầu tên sinh viên từ LocalStorage và đồng thời lắng nghe cập nhật realtime từ Firebase Database.
function hienThiGiaoDienTaiKhoan() {
  let tenSVDong = currentStudent.name
    ? currentStudent.name
    : "Sinh viên ẩn danh";
  let mssvSVDong = currentStudent.id ? currentStudent.id : "000000";
  let btnEl = document.getElementById("avatar-nut-bam");
  if (!btnEl) return;

  // 1. Tải nhanh từ localStorage trước
  let savedImg = localStorage.getItem("user_avatar_base64_" + mssvSVDong);
  if (savedImg) {
    btnEl.innerHTML = `<img src="${savedImg}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
  } else {
    btnEl.innerHTML = `<span id="avatar-chu-cai">${tenSVDong.trim().charAt(0).toUpperCase()}</span>`;
  }

  // 2. Lắng nghe Realtime từ Firebase (cập nhật nếu có ảnh mới trên cloud)
  if (currentStudent.id) {
    database
      .ref("users/" + currentStudent.id + "/avatar")
      .on("value", (snapshot) => {
        let firebaseAvatar = snapshot.val();
        if (firebaseAvatar) {
          // Cập nhật vào localStorage để lần sau mở web nhanh hơn
          localStorage.setItem(
            "user_avatar_base64_" + mssvSVDong,
            firebaseAvatar,
          );
          // Cập nhật giao diện ngay lập tức
          btnEl.innerHTML = `<img src="${firebaseAvatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
        }
      });
  }
}

// Chức năng: Kiểm tra tính hợp lệ, chống trùng lặp MSSV và thực hiện lưu trữ thông tin thay đổi tài khoản người dùng lên hệ thống.
function luuThayDoiTaiKhoan() {
  let newName = document.getElementById("menu-input-ten").value.trim();
  let newId = document.getElementById("menu-input-mssv").value.trim();
  if (newName === "" || newId === "") {
    alert("Họ tên và MSSV không được để trống!");
    return;
  }
  if (newId === "7277979906" && newName !== "trung_admin") {
    alert("Thông tin xác thực Admin không hợp lệ!");
    return;
  }

  database.ref("threads").once("value", (snapshot) => {
    let threadsData = snapshot.val();
    let isDuplicated = false;
    if (threadsData) {
      Object.keys(threadsData).forEach((postKey) => {
        let post = threadsData[postKey];
        if (
          post.mssv &&
          post.mssv.trim() === newId &&
          newId !== currentStudent.id.trim()
        ) {
          isDuplicated = true;
        }
      });
    }
    if (isDuplicated) {
      alert(
        "⚠️ Tài khoản này (MSSV: " +
          newId +
          ") đã tồn tại trong hệ thống. Vui lòng cập nhật MSSV khác!",
      );
    } else {
      thucHienLuuThayDoi(newName, newId);
    }
  });
}

// Chức năng: Cập nhật thông tin sinh viên mới, xử lý đặt lại hoặc đồng bộ avatar và cập nhật đồng loạt tên/MSSV mới cho toàn bộ các bài viết, bình luận cũ trên Firebase.
function thucHienLuuThayDoi(newName, newId) {
  let oldId = currentStudent.id ? currentStudent.id.trim() : "000000";
  let oldName = currentStudent.name ? currentStudent.name.trim() : "";

  // TẠO KEY ĐỊNH DANH DUY NHẤT DỰA TRÊN CẢ TÊN VÀ MSSV
  let newUniqueKey = newName + "_" + newId;
  let oldUniqueKey = oldName + "_" + oldId;

  // Lấy ảnh cũ theo định danh cũ
  let currentAvatar =
    localStorage.getItem("user_avatar_base64_" + oldUniqueKey) || "";

  // NẾU THÔNG TIN BỊ THAY ĐỔI -> RESET AVATAR
  // Tức là nếu Tên hoặc MSSV khác với cũ thì xóa sạch ảnh cũ trong localStorage
  if (newName !== oldName || newId !== oldId) {
    localStorage.removeItem("user_avatar_base64_" + oldUniqueKey);
    currentAvatar = ""; // Reset về rỗng để bắt đầu chọn ảnh mới
  }

  // Cập nhật thông tin sinh viên mới
  currentStudent.name = newName;
  currentStudent.id = newId;
  localStorage.setItem(
    "current_logged_student",
    JSON.stringify(currentStudent),
  );

  // Cập nhật Firebase (giữ nguyên logic của anh)
  database.ref("threads").once("value", (snapshot) => {
    let threadsData = snapshot.val();
    if (threadsData) {
      let updates = {};
      Object.keys(threadsData).forEach((postKey) => {
        let post = threadsData[postKey];
        if (post.mssv && post.mssv.trim() === oldId) {
          updates[`threads/${postKey}/author`] = newName;
          updates[`threads/${postKey}/mssv`] = newId;
          // Nếu đổi người, cần xóa ảnh cũ ở bài đăng cũ (hoặc cập nhật ảnh rỗng)
          if (newName !== oldName || newId !== oldId) {
            updates[`threads/${postKey}/avatar`] = "";
          }
        }
        if (post.comments) {
          Object.keys(post.comments).forEach((cmtKey) => {
            if (
              post.comments[cmtKey].mssv &&
              post.comments[cmtKey].mssv.trim() === oldId
            ) {
              updates[`threads/${postKey}/comments/${cmtKey}/user`] = newName;
              updates[`threads/${postKey}/comments/${cmtKey}/mssv`] = newId;
              if (newName !== oldName || newId !== oldId) {
                updates[`threads/${postKey}/comments/${cmtKey}/avatar`] = "";
              }
            }
          });
        }
      });
      database.ref().update(updates);
    }
  });

  hienThiGiaoDienTaiKhoan();
  let menu = document.getElementById("menu-tha-tai-khoan");
  if (menu) menu.classList.remove("hien-thi-user");

  alert(
    newName !== oldName || newId !== oldId
      ? "Đã đổi người dùng! Avatar đã được reset, hãy chọn ảnh mới nhé."
      : "Cập nhật thông tin thành công!",
  );
}

// Chức năng: Đọc tệp ảnh tải lên từ thiết bị, mã hóa Base64, lưu trữ lên Firebase Database lẫn LocalStorage và gọi hàm cập nhật ảnh đại diện hàng loạt cho các bài đăng cũ.
function capNhatAvatarTaiKhoan(input) {
  let mssv = currentStudent.id;
  if (!mssv) return alert("Vui lòng đăng nhập!");
  if (input.files && input.files[0]) {
    let reader = new FileReader();
    reader.onload = function (e) {
      let base64Img = e.target.result;
      database.ref("users/" + mssv + "/avatar").set(base64Img);
      localStorage.setItem("user_avatar_base64_" + mssv, base64Img);
      capNhatAnhTatCaBaiDangCu(mssv, base64Img);
      hienThiGiaoDienTaiKhoan();
      alert("Đã đồng bộ avatar lên hệ thống!");
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// Chức năng: Quét toàn bộ bài viết và bình luận trên Firebase để cập nhật hình ảnh đại diện mới đồng bộ cho một mã số sinh viên cụ thể.
function capNhatAnhTatCaBaiDangCu(mssv, newAvatar) {
  database.ref("threads").once("value", (snapshot) => {
    let updates = {};
    snapshot.forEach((child) => {
      let post = child.val();
      let postId = child.key;

      // Update avatar tác giả bài viết
      if (post.mssv === mssv) {
        updates[`threads/${postId}/avatar`] = newAvatar;
      }

      // Update avatar người bình luận trong bài viết đó
      if (post.comments) {
        Object.keys(post.comments).forEach((cmtKey) => {
          if (post.comments[cmtKey].mssv === mssv) {
            updates[`threads/${postId}/comments/${cmtKey}/avatar`] = newAvatar;
          }
        });
      }
    });
    database.ref().update(updates); // Cập nhật hàng loạt lên Firebase
  });
}

// Chức năng: Hiển thị hộp thoại xác nhận, xóa thông tin đăng nhập khỏi LocalStorage và tải lại trang web.
function dangXuatTaiKhoan() {
  if (confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
    localStorage.removeItem("current_logged_student");
    location.reload();
  }
}

// =========================================
// 👑 6. BANNER CAROUSEL HOẠT ĐỘNG THÔNG MINH
// =========================================
(function () {
  let isMobile = window.innerWidth <= 768;
  const container = document.getElementById(
    isMobile ? "carousel-container-mobile" : "carousel-container-pc",
  );
  const track = document.getElementById(
    isMobile ? "carousel-track-mobile" : "carousel-track-pc",
  );

  if (!container || !track) return;

  const originalSlides = Array.from(track.children);
  if (originalSlides.length === 0) return;

  const firstClone = originalSlides[0].cloneNode(true);
  const lastClone = originalSlides[originalSlides.length - 1].cloneNode(true);
  track.appendChild(firstClone);
  track.insertBefore(lastClone, originalSlides[0]);

  let slides = Array.from(track.children);
  let currentIndex = 1;
  let autoPlayTimer = setInterval(() => {
    currentIndex++;
    track.style.transition = "transform 0.5s ease-in-out";
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
  }, 3500);

  track.addEventListener("transitionend", () => {
    if (currentIndex >= slides.length - 1) {
      track.style.transition = "none";
      currentIndex = 1;
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
    }
    if (currentIndex <= 0) {
      track.style.transition = "none";
      currentIndex = slides.length - 2;
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
    }
  });
})();
// ==========================================
// 🌐 HỆ THỐNG ĐẾM & ĐỒNG BỘ SỐ NGƯỜI ONLINE (FIREBASE)
// ==========================================
function updateOnlineStatus() {
  // Nếu chưa đăng nhập, dùng một ID ngẫu nhiên làm khách (guest) để đếm
  let student = JSON.parse(localStorage.getItem("current_logged_student"));
  let userId =
    student && student.id
      ? student.id.trim()
      : "guest_" + Math.random().toString(36).substring(2, 9);
  let userName = student && student.name ? student.name : "Khách tham quan";

  let userRef = database.ref("online_users/" + userId);

  // Khi người dùng tắt tab hoặc thoát web, tự động xóa khỏi danh sách online
  userRef.onDisconnect().remove();

  // Ghi trạng thái online hiện tại kèm thời gian lên Database
  userRef.set({
    name: userName,
    lastSeen: firebase.database.ServerValue.TIMESTAMP,
  });
}

// Gọi hàm cập nhật online ngay khi load trang hoặc đăng nhập thành công
document.addEventListener("DOMContentLoaded", function () {
  updateOnlineStatus();
});

// Lắng nghe Realtime từ Database để cập nhật số lượng liên tục giữa tất cả thiết bị
database.ref("online_users").on("value", (snapshot) => {
  let count = snapshot.numChildren(); // Đếm tổng số thiết bị/người đang kết nối
  let displayEl = document.getElementById("wau_count");
  if (displayEl) {
    displayEl.innerText = count;
  }
});
function nopBaiSom() {
  if (confirm("Bạn có chắc chắn muốn nộp bài và xem kết quả không?")) {
    if (typeof countdownSound !== "undefined") {
      countdownSound.pause();
      countdownSound.currentTime = 0;
    }
    ketthucbaithi();
  }
}
