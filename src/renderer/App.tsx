import { createRoot } from "react-dom/client";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { useAtomValue } from "jotai";
import { Header } from "./Header";
import { Settings } from "./Settings";
import { NotificationDisplay } from "./NotificationDisplay";
import { ToastContainer } from "react-toastify";
import { settingsAtom } from "./atoms";

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

const App = () => {
  const theme = useAtomValue(settingsAtom).theme;
  const themeObj = theme === "dark" ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={themeObj}>
      <CssBaseline />
      <Header />
      <NotificationDisplay />
      <Settings />
      <ToastContainer position="bottom-right" />
    </ThemeProvider>
  );
};

const root = createRoot(document.body);
root.render(<App />);
