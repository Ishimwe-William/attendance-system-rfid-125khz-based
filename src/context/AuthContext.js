import { createContext, useState, useEffect, useContext } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setError(null);

        if (currentUser) {
          // Get user data from Firestore
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: currentUser.uid,
              email: currentUser.email,
              emailVerified: currentUser.emailVerified,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              ...userData
            });
          } else {
            // Handle case where user document doesn't exist
            console.warn('User document not found in Firestore');
            setUser({
              uid: currentUser.uid,
              email: currentUser.email,
              emailVerified: currentUser.emailVerified,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: 'lecture' // Default role
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load user data');
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [auth]);

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to logout');
      throw error;
    }
  };

  const clearError = () => setError(null);

  const hasRole = (requiredRole) => {
    if (!user) return false;
    if (requiredRole === 'admin') return user.role === 'admin';
    return true; // All authenticated users can access non-admin routes
  };

  const value = {
    user,
    loading,
    error,
    logout,
    clearError,
    hasRole,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return (
      <AuthContext.Provider value={value}>
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