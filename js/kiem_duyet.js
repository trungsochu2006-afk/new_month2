// 🚫 DANH SÁCH TỪ CẤM
const TU_CAM_BLACKLIST = [
  "dâm",
  "vú",
  "địt",
  "sex",
  "pussy",
  "nude",
  "bướm",
  "cu",
  "cac",
  "lon",
];
// Chức năng: Kiểm tra nội dung văn bản đầu vào có chứa các từ khóa nằm trong danh sách đen từ cấm hay không.
function kiemDuyetNoiDung(text) {
  let textLower = text.toLowerCase();
  return TU_CAM_BLACKLIST.some((tu) => textLower.includes(tu));
}
