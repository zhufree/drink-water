import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { DesktopPet } from "./components/DesktopPet";
import "./styles.css";

const isDesktopPet = getCurrentWindow().label === "pet";

if (isDesktopPet) {
  document.documentElement.classList.add("pet-mode");
  document.body.classList.add("pet-mode");
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isDesktopPet ? <DesktopPet /> : <App />}
  </React.StrictMode>
);
