import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./auth.jsx";
import { ToastProvider } from "./components/ui.jsx";
import App from "./App.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>,
);
