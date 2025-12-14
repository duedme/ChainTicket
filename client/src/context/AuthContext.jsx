import { createContext, useContext, useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const { ready, authenticated, user: privyUser, login: privyLogin, logout: privyLogout } = usePrivy();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (ready) {
            setLoading(false);
            if (authenticated && privyUser) {
                const walletAddress = privyUser.wallet?.address || null;
                setUser({
                    role: 'client',
                    name: privyUser.email?.address || privyUser.wallet?.address?.slice(0, 10) || 'User',
                    wallet: walletAddress,
                    privyId: privyUser.id
                });
            } else {
                setUser(null);
            }
        }
    }, [ready, authenticated, privyUser]);

    const login = async (username, password) => {
        setLoading(true);
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
        privyLogin();
    };

    const logout = async () => {
        if (authenticated) {
            await privyLogout();
        }
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, connectWallet, loading, ready, authenticated }}>
            {children}
        </AuthContext.Provider>
    );
};
