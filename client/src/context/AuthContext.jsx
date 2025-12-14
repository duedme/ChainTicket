import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // { role: 'admin' | 'client', wallet: string | null }
    const [loading, setLoading] = useState(false);

    const login = async (username, password) => {
        setLoading(true);
        // Mimic API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (username === 'admin' && password === '123') {
            setUser({ role: 'admin', name: 'Admin User' });
            setLoading(false);
            return true;
        }

        if (username === 'user' && password === '123') {
            setUser({ role: 'client', name: 'Client User' });
            setLoading(false);
            return true;
        }

        setLoading(false);
        return false;
    };

    const connectWallet = async () => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Mock wallet connection for now
        const mockWallet = "0x71C...9A21";
        // For demo purposes, auto-login as client if wallet connects, or just attach wallet
        setUser({ role: 'client', name: 'Wallet User', wallet: mockWallet });
        setLoading(false);
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, connectWallet, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
