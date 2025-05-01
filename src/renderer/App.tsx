import { createRoot } from "react-dom/client";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import Button from "@mui/material/Button";

import "./index.scss";

const App = () => {
  return <ButtonUsage />;
};

export default function ButtonUsage() {
  return <Button variant="contained">Hello world</Button>;
}
const root = createRoot(document.body);
root.render(<App />);
