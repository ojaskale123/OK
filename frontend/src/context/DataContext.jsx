import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
    const { token, user } = useAuth();
    const [products, setProducts] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);

    const refreshProducts = async () => {
        if (!token) return;
        try {
            setIsLoadingProducts(true);
            const res = await fetch('https://ok-ax2v.onrender.com/api/products', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setProducts(data);
            }
        } catch (e) {
            console.error('Failed to load products', e);
        } finally {
            setIsLoadingProducts(false);
        }
    };

    // Fetch products once when token becomes available
    useEffect(() => {
        refreshProducts();
    }, [token]);

    return (
        <DataContext.Provider value={{ products, setProducts, isLoadingProducts, refreshProducts }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
