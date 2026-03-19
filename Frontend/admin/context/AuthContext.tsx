import React, { createContext, useState, useEffect, useContext } from 'react';
import {
    onAuthStateChanged,
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    verifyBeforeUpdateEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';

type Role = 'parent' | 'driver' | null;

interface AuthContextType {
    user: User | null;
    role: Role;
    isLoading: boolean;
    login: (email: string, password: string, role: Role) => Promise<void>;
    register: (email: string, password: string, role: Role) => Promise<void>;
    logout: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    updateUserEmail: (newEmail: string) => Promise<void>;
    updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    console.log("AuthProvider mounting...");
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Derive role from Firestore — the authoritative source.
                // AsyncStorage is only a fast-path cache; we always verify against Firestore
                // to prevent a user from spoofing their role by tampering with local storage.
                let resolvedRole: Role = null;
                try {
                    // Try drivers collection first, then parents
                    const driverSnap = await getDoc(doc(db, 'drivers', currentUser.uid));
                    if (driverSnap.exists() && driverSnap.data().role === 'driver') {
                        resolvedRole = 'driver';
                    } else {
                        const parentSnap = await getDoc(doc(db, 'parents', currentUser.uid));
                        if (parentSnap.exists() && parentSnap.data().role === 'parent') {
                            resolvedRole = 'parent';
                        }
                    }
                } catch {
                    // Network unavailable — fall back to cached role
                    const storedRole = await AsyncStorage.getItem('userRole');
                    if (storedRole === 'driver' || storedRole === 'parent') {
                        resolvedRole = storedRole as Role;
                    }
                }
                if (resolvedRole) {
                    await AsyncStorage.setItem('userRole', resolvedRole);
                }
                setRole(resolvedRole);
            } else {
                setRole(null);
            }
            setIsLoading(false);
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = (segments[0] as string) === '(auth)';
        const inRoleSelection = segments[0] === 'RoleSelectionScreen';
        const inIndex = segments[0] === 'index' || segments[0] === undefined;

        if (user && role && inAuthGroup) {
            // Unverified users must verify their email before entering the app
            if (!user.emailVerified) {
                router.replace('/(auth)/Verify');
            } else if (role === 'driver') {
                router.replace('/Driver/DriverMap');
            } else {
                router.replace('/Parent');
            }
        } else if (user && role && !inAuthGroup && !inRoleSelection && !inIndex && !user.emailVerified) {
            // Logged-in but unverified user is on a protected route → send to Verify
            router.replace('/(auth)/Verify');
        } else if (!user && !inAuthGroup && !inRoleSelection && !inIndex) {
            // Not logged in and on a protected route → back to role selection
            router.replace('/RoleSelectionScreen');
        }
    }, [user, role, isLoading, segments]);


    const login = async (email: string, password: string, _selectedRole: Role) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Role is resolved from Firestore in the onAuthStateChanged handler above.
            // We intentionally do NOT set role from the login screen's selection to
            // prevent clients from injecting an arbitrary role.
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const register = async (email: string, password: string, selectedRole: Role) => {
        try {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = credential.user.uid;

            // Create Firestore profile — callers (DriverRegister/ParentRegister) may
            // overwrite with richer data; this ensures the document always exists.
            if (selectedRole === 'driver') {
                await setDoc(doc(db, 'drivers', uid), {
                    driverId: uid, email, role: 'driver',
                    name: '', phone: '', licenseNumber: '', vehicleNumber: '',
                    routeId: null, expoPushToken: null, tokenUpdatedAt: null,
                    associatedParentIds: [], activeTripId: null, averageRating: null,
                    isActive: false, termsAccepted: false, termsAcceptedAt: null,
                    createdAt: new Date().toISOString(),
                }, { merge: true });
            } else if (selectedRole === 'parent') {
                await setDoc(doc(db, 'parents', uid), {
                    parentId: uid, email, role: 'parent',
                    name: '', phone: '',
                    assignedDriverId: null, routeId: null,
                    expoPushToken: null, tokenUpdatedAt: null,
                    termsAccepted: false, termsAcceptedAt: null,
                    createdAt: new Date().toISOString(),
                }, { merge: true });
            }

            if (selectedRole) {
                await AsyncStorage.setItem('userRole', selectedRole);
                setRole(selectedRole);
            }
        } catch (error) {
            console.error("Registration failed", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await firebaseSignOut(auth);
            await AsyncStorage.removeItem('userRole');
            setRole(null);
            router.replace('/RoleSelectionScreen');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const sendPasswordReset = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            console.error("Password reset failed", error);
            throw error;
        }
    };

    const updateUserEmail = async (newEmail: string): Promise<void> => {
        if (!auth.currentUser) throw new Error('Not logged in');
        await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
        // Optimistically update Firestore record
        const col = role === 'driver' ? 'drivers' : 'parents';
        await updateDoc(doc(db, col, auth.currentUser.uid), { email: newEmail });
    };

    const updateUserPassword = async (currentPwd: string, newPwd: string): Promise<void> => {
        if (!auth.currentUser || !auth.currentUser.email) throw new Error('Not logged in');
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPwd);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPwd);
    };

    return (
        <AuthContext.Provider value={{ user, role, isLoading, login, register, logout, sendPasswordReset, updateUserEmail, updateUserPassword }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
