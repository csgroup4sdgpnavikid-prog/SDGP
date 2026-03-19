import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";

export interface Student {
    id: string;         // childId (Firestore doc ID)
    name: string;
    age: number;
    school: string;
    grade: string;
    parentId: string;
    parentName: string;
    parentPhone: string;
    status: "Present" | "Absent";
    isAbsent: boolean;
}

/**
 * Load all students assigned to the currently logged-in driver.
 * Uses Promise.all to parallelise all Firestore reads — avoids N+1 pattern.
 */
export async function getStudents(tripType: "morning" | "evening" = new Date().getHours() < 12 ? "morning" : "evening"): Promise<Student[]> {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];

    const driverSnap = await getDoc(doc(db, "drivers", uid));
    if (!driverSnap.exists()) return [];

    const parentIds: string[] = driverSnap.data().associatedParentIds || [];
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    // Fetch all parent docs + all children subcollections in parallel
    const [parentSnaps, childrenSnaps] = await Promise.all([
        Promise.all(parentIds.map((pid) => getDoc(doc(db, "parents", pid)))),
        Promise.all(parentIds.map((pid) => getDocs(collection(db, "parents", pid, "children")))),
    ]);

    // Build a flat list of { childDoc, parentId, parentName, parentPhone }
    const childEntries: { childDoc: any; parentId: string; parentName: string; parentPhone: string }[] = [];
    for (let i = 0; i < parentIds.length; i++) {
        const pSnap = parentSnaps[i];
        const parentName = pSnap.exists() ? (pSnap.data().name || "") : "";
        const parentPhone = pSnap.exists() ? (pSnap.data().phone || "") : "";
        for (const childDoc of childrenSnaps[i].docs) {
            childEntries.push({ childDoc, parentId: parentIds[i], parentName, parentPhone });
        }
    }

    // Check all absences in parallel
    const absenceResults = await Promise.all(
        childEntries.map(({ childDoc }) =>
            getDocs(
                query(
                    collection(db, "absences"),
                    where("childId", "==", childDoc.id),
                    where("date", "==", today),
                    where("status", "==", "confirmed"),
                )
            )
        )
    );

    return childEntries.map(({ childDoc, parentId, parentName, parentPhone }, idx) => {
        const c = childDoc.data();
        // Only use today's confirmed absence records filtered by trip type
        const isAbsent = absenceResults[idx].docs.some((d) => {
            const t = d.data().absenceType;
            return t === "full_day"
                || (t === "morning_only" && tripType === "morning")
                || (t === "evening_only" && tripType === "evening");
        });
        return {
            id: childDoc.id,
            name: c.name || "Unknown",
            age: c.age || 0,
            school: c.school || "",
            grade: c.grade || c.class || "",
            parentId,
            parentName,
            parentPhone,
            status: isAbsent ? "Absent" : "Present",
            isAbsent,
        };
    });
}
