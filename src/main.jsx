import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="fatal">
          <h1>حدث خطأ غير متوقع</h1>
          <p>حدّث الصفحة وحاول مرة أخرى.</p>
          <button className="btn" onClick={() => location.reload()}>تحديث الصفحة</button>
        </div>
      );
    }
    return this.props.children;
  }
}

document.documentElement.classList.add("js");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
