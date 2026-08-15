import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch, authHeaders } from '../utils/api';

const DataContext = createContext();

function normalizeProduct(p) {
  if (!p) return p;
  const hasImage = p.hasImage ?? Boolean(p.image && p.image.length > 0);
  return { ...p, hasImage };
}

export const DataProvider = ({ children }) => {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [productTotal, setProductTotal] = useState(0);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState(null);
  const inflightImages = useRef(new Set());
  const attemptedImages = useRef(new Set());

  const refreshProducts = useCallback(async () => {
    if (!token) {
      setProducts([]);
      setProductTotal(0);
      return;
    }

    inflightImages.current.clear();
    attemptedImages.current.clear();

    try {
      setIsLoadingProducts(true);
      setProductsError(null);
      const res = await apiFetch('/api/products', {
        headers: authHeaders(token),
      });

      if (!res.ok) {
        if (res.status !== 401) {
          setProductsError('Could not load inventory. Please try again.');
        }
        return;
      }

      const data = await res.json();
      const items = Array.isArray(data) ? data : data.items;
      if (Array.isArray(items)) {
        setProducts(items.map(normalizeProduct));
        setProductTotal(data.total ?? items.length);
      }
    } catch {
      setProductsError('Could not reach the server. Retrying…');
    } finally {
      setIsLoadingProducts(false);
    }
  }, [token]);

  const searchProducts = useCallback(async (search, category = 'All') => {
    if (!token) return [];
    const params = new URLSearchParams();
    if (search?.trim()) params.set('search', search.trim());
    if (category && category !== 'All') params.set('category', category);
    params.set('limit', '80');

    const res = await apiFetch(`/api/products?${params}`, {
      headers: authHeaders(token),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map(normalizeProduct);
  }, [token]);

  const fetchProductDetail = useCallback(async (id) => {
    if (!token) return null;
    const res = await apiFetch(`/api/products/${id}`, { headers: authHeaders(token) });
    if (!res.ok) return null;
    return res.json();
  }, [token]);

  const hydrateProductImage = useCallback(
    async (productId) => {
      if (!token || !productId || inflightImages.current.has(productId)) return;
      inflightImages.current.add(productId);

      try {
        const detail = await fetchProductDetail(productId);
        if (!detail?.image) return;

        setProducts((prev) =>
          prev.map((p) =>
            p._id === productId ? { ...p, image: detail.image, hasImage: true } : p
          )
        );
      } finally {
        inflightImages.current.delete(productId);
      }
    },
    [token, fetchProductDetail]
  );

  const getProductImage = useCallback((p) => {
    if (!p) return '';
    return p.image || '';
  }, []);

  const upsertProduct = useCallback((product) => {
    const normalized = normalizeProduct(product);
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p._id === normalized._id);
      if (idx === -1) {
        setProductTotal((t) => t + 1);
        return [normalized, ...prev];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...normalized };
      return next;
    });
  }, []);

  const removeProduct = useCallback((id) => {
    setProducts((prev) => prev.filter((p) => p._id !== id));
    setProductTotal((t) => Math.max(0, t - 1));
  }, []);

  const patchProductStock = useCallback((productId, quantityDelta) => {
    setProducts((prev) =>
      prev.map((p) =>
        p._id === productId
          ? { ...p, stockQuantity: Math.max(0, (p.stockQuantity || 0) + quantityDelta) }
          : p
      )
    );
  }, []);

  useEffect(() => {
    if (!token) return;
    refreshProducts();
  }, [token, refreshProducts]);

  useEffect(() => {
    if (!token) return;
    products
      .filter((p) => p.hasImage && !p.image && !attemptedImages.current.has(p._id))
      .forEach((p) => {
        attemptedImages.current.add(p._id);
        hydrateProductImage(p._id);
      });
  }, [products, token, hydrateProductImage]);

  const value = useMemo(
    () => ({
      products,
      productTotal,
      setProducts,
      isLoadingProducts,
      productsError,
      refreshProducts,
      searchProducts,
      upsertProduct,
      removeProduct,
      patchProductStock,
      fetchProductDetail,
      getProductImage,
      hydrateProductImage,
    }),
    [
      products,
      productTotal,
      isLoadingProducts,
      productsError,
      refreshProducts,
      searchProducts,
      upsertProduct,
      removeProduct,
      patchProductStock,
      fetchProductDetail,
      getProductImage,
      hydrateProductImage,
    ]
  );

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
