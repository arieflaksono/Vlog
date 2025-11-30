import * as firebaseApp from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp,
  writeBatch,
  getDocs
} from "firebase/firestore";
import * as firebaseAuth from "firebase/auth";
import { StudentSubmission } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyAbcX2xi5-Zd2EY5kmiNh6zaoEgPhxjo5s",
  authDomain: "vlog-11eeb.firebaseapp.com",
  projectId: "vlog-11eeb",
  storageBucket: "vlog-11eeb.firebasestorage.app",
  messagingSenderId: "995096363286",
  appId: "1:995096363286:web:8643e6eef863551e9d5037",
  measurementId: "G-BSL45BEP4X"
};

// Initialize Firebase
const app = firebaseApp.initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = firebaseAuth.getAuth(app);
const COLLECTION_NAME = "submissions";

// --- AUTHENTICATION SERVICES ---

export const loginAdmin = async (email, password) => {
  return await firebaseAuth.signInWithEmailAndPassword(auth, email, password);
};

export const logoutAdmin = async () => {
  return await firebaseAuth.signOut(auth);
};

export const subscribeToAuth = (callback: (user: any | null) => void) => {
  return firebaseAuth.onAuthStateChanged(auth, callback);
};

// --- FIRESTORE SERVICES ---

/**
 * Mendengarkan perubahan data secara realtime dari Firestore.
 * Callback akan dipanggil setiap kali ada data baru, update, atau hapus.
 */
export const subscribeToSubmissions = (callback: (data: StudentSubmission[]) => void, onError?: (error: any) => void) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("submittedAt", "desc"));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const submissions: StudentSubmission[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id, // Gunakan ID dari Firestore
        studentName: data.studentName,
        kelas: data.kelas,
        noAbsen: data.noAbsen,
        videoUrl: data.videoUrl,
        videoId: data.videoId,
        videoTitle: data.videoTitle,
        status: data.status,
        submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : new Date(data.submittedAt),
        aiFeedback: data.aiFeedback,
        score: data.score,
        teacherFeedback: data.teacherFeedback
      } as StudentSubmission;
    });
    callback(submissions);
  }, (error) => {
    console.error("Error fetching realtime data:", error);
    if (onError) onError(error);
  });

  return unsubscribe;
};

/**
 * Menambahkan tugas baru ke Firestore
 */
export const addSubmissionToFirebase = async (data: Omit<StudentSubmission, 'id'>) => {
  try {
    // Firestore tidak menerima value 'undefined'. Kita harus menghapus key tersebut
    // jika nilainya undefined agar tidak error.
    const sanitizedData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    // Timeout after 30 seconds (increased from 10s) to prevent premature timeouts on slow networks
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Koneksi database timeout (30s). Periksa internet Anda.")), 30000)
    );

    await Promise.race([
      addDoc(collection(db, COLLECTION_NAME), {
        ...sanitizedData,
        submittedAt: Timestamp.fromDate(data.submittedAt)
      }),
      timeoutPromise
    ]);
  } catch (error) {
    console.error("Error adding document: ", error);
    // Handle specific permission error for better UX
    if (error.code === 'permission-denied') {
      throw new Error("Izin ditolak. Pastikan Rules di Firebase Console sudah benar (public/test mode).");
    }
    throw error;
  }
};

/**
 * Mengupdate nilai dan feedback guru
 */
export const updateGradeInFirebase = async (id: string, score: number, teacherFeedback: string) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      score: score,
      teacherFeedback: teacherFeedback
    });
  } catch (error) {
    console.error("Error updating grade: ", error);
    throw error;
  }
};

/**
 * Mengupdate data detail siswa (Nama, Kelas, Absen) - Fitur Edit Admin
 */
export const updateStudentDataInFirebase = async (id: string, studentName: string, kelas: string, noAbsen: string) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      studentName: studentName,
      kelas: kelas,
      noAbsen: noAbsen
    });
  } catch (error) {
    console.error("Error updating student data: ", error);
    throw error;
  }
};

/**
 * Menghapus tugas dari database (Satu per satu)
 */
export const deleteSubmissionFromFirebase = async (id: string) => {
  try {
    // Timeout check untuk delete juga
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Koneksi timeout. Gagal menghapus.")), 30000)
    );

    if (!id) throw new Error("ID tidak valid");

    await Promise.race([
      deleteDoc(doc(db, COLLECTION_NAME, id)),
      timeoutPromise
    ]);
  } catch (error) {
    console.error("Error deleting document: ", error);
    throw error;
  }
};

/**
 * Menghapus SEMUA data tugas (Batch Delete)
 * Note: Firestore Batch limit adalah 500 operasi.
 */
export const deleteAllSubmissionsFromFirebase = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;

    // Buat Batch baru
    const batch = writeBatch(db);
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Commit batch delete
    await batch.commit();
  } catch (error) {
    console.error("Error deleting all documents: ", error);
    throw error;
  }
};