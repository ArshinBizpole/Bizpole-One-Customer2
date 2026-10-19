import { createContext, useEffect, useState } from "react";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({});

  // Load cart from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("SelectedServicePrices");
    setCart(stored ? JSON.parse(stored) : {});
  }, []);

  // Update localStorage when cart changes
  useEffect(() => {
    localStorage.setItem("SelectedServicePrices", JSON.stringify(cart));
  }, [cart]);

  // Empty the cart on logout / session expiry (every path fires this event, see
  // utils/authSession) so the next person on this browser doesn't inherit it.
  useEffect(() => {
    const onSessionCleared = () => {
      localStorage.removeItem("SelectedServices");
      localStorage.removeItem("AllServicesCache");
      setCart({});
    };
    window.addEventListener("auth-session-cleared", onSessionCleared);
    return () => window.removeEventListener("auth-session-cleared", onSessionCleared);
  }, []);

  const addToCart = (serviceId, priceObj) => {
    setCart((prev) => ({ ...prev, [serviceId]: priceObj }));
  };

  const removeFromCart = (serviceId) => {
    setCart((prev) => {
      const newCart = { ...prev };
      delete newCart[serviceId];
      return newCart;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
