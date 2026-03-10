import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ParentLogin" />
            <Stack.Screen name="ParentRegister" />
            <Stack.Screen name="DriverLogin" />
            <Stack.Screen name="DriverRegister" />
            <Stack.Screen name="Verify" />
            <Stack.Screen name="ConfirmPassword" />
            <Stack.Screen name="SendMail" />
            <Stack.Screen name="PasswordUpdate" />
        </Stack>
    );
}
