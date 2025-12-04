import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CartProvider } from "./state/CartContext";
import "./index.css";

/**
 * Ensure you have an element with id="root" in index.html
 * This file simply mounts the app and wraps it in CartProvider.
 */

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </React.StrictMode>
);
