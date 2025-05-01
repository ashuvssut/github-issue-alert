import { createRoot } from "react-dom/client";

const App = () => {
  return <h2>Hello from React!</h2>;
};

const root = createRoot(document.body);
root.render(<App />);
