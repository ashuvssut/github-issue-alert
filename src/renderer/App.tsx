import { createRoot } from "react-dom/client";
import { startIssueChecking } from "./issueFetcher";

const App = () => {
  return <h2>Hello from React!</h2>;
};

const root = createRoot(document.body);
root.render(<App />);

startIssueChecking();
