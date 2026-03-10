import React, { createContext, useState, useEffect, useContext } from 'react';
import {
    onAuthStateChanged,
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
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
                // Retrieve role from storage if available
                const storedRole = await AsyncStorage.getItem('userRole');
                if (storedRole) {
                    setRole(storedRole as Role);
                }
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

        if (!user && !inAuthGroup && segments[0] !== 'RoleSelectionScreen') {
            // If not logged in and trying to access protected route, redirect to role selection
            // This might need adjustment depending on exact flow, 
            // allows skipping directly to role selection if they are deep in the app
            // For now, let's rely on manual navigation in login screens
        }
    }, [user, isLoading, segments]);


    const login = async (email: string, password: string, selectedRole: Role) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Save role locally
            if (selectedRole) {
                await AsyncStorage.setItem('userRole', selectedRole);
                setRole(selectedRole);
            }
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const register = async (email: string, password: string, selectedRole: Role) => {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
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

    return (
        <AuthContext.Provider value={{ user, role, isLoading, login, register, logout, sendPasswordReset }}>
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
