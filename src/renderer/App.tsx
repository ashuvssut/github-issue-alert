import { createRoot } from "react-dom/client";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { Header } from "./Header";
import { NotificationDisplay } from "./NotificationDisplay";
import { ToastContainer } from "react-toastify";

import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "./index.scss";

const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    background: { default: "#f5f5f5" },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#90caf9" },
    background: { default: "#121212" },
  },
});

export const themeAtom = atomWithStorage("theme", "dark" as "light" | "dark");

const App = () => {
  const [theme] = useAtom(themeAtom);

  const themeObj = theme === "dark" ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={themeObj}>
      <CssBaseline />
      <Header />
      <NotificationDisplay />
      <ToastContainer position="bottom-right"/>
    </ThemeProvider>
  );
};

const root = createRoot(document.body);
root.render(<App />);
