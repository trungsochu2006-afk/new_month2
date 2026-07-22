const firebaseConfig = {
  apiKey: "AIzaSyB-4sdYIrm5CtrloB1BHKhwzidJuuqdssg",
  authDomain: "threads-phenikaa.firebaseapp.com",
  databaseURL:
    "https://threads-phenikaa-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "threads-phenikaa",
  storageBucket: "threads-phenikaa.firebasestorage.app",
  messagingSenderId: "974324685359",
  appId: "1:974324685359:web:3b876af550d0b5de5504da",
  measurementId: "G-GEXKM5F77L",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
