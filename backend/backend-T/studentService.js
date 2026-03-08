
import { collection, getDocs } from "firebase/firestore";
import { db } from "../backend/firebaseConfig";

export const getStudents = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "students"));
    const students = [];

    querySnapshot.forEach((doc) => {
      students.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return students;
  } catch (error) {
    console.error("Error fetching students:", error);
    return [];
  }
};
