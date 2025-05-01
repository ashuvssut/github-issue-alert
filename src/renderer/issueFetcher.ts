import { components } from "@octokit/openapi-types";

const API_URL =
  "https://api.github.com/repos/Expensify/App/issues?sort=created&direction=desc&per_page=1";
// const ZAP_URL = "https://hooks.zapier.com/hooks/catch/22546727/2x2oxt0/";

let lastSeenId: number | null = null;
let etag: string | null = null;

type GitHubIssue = components["schemas"]["issue"];
async function handleNewIssue(latestIssue: GitHubIssue): Promise<void> {
  // Send data to Zapier webhook
  // await fetch(ZAP_URL, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     number: latest.number,
  //     title: latest.title,
  //     url: latest.html_url,
  //   }),
  // });

  // secondary action "Open all latest issues" = https://github.com/Expensify/App/issues?q=is%3Aissue%20is%3Aopen%20%20sort%3Acreated-desc
  const title = latestIssue.title;
  const labels = latestIssue.labels
    .map((label) => (typeof label === "string" ? label : label.name))
    .join(", ");
  const subtitle = `${latestIssue.user.login} | ${labels}`;
  const message = latestIssue.body?.substring(0, 200) || "(no description)";
  const open = latestIssue.html_url;
  const sound = "default";
  const contentImage = "https://avatars.githubusercontent.com/u/476779";

  const command = [
    "terminal-notifier",
    "-group",
    "expensify-issue-alert",
    "-title",
    `"${title}"`,
    "-subtitle",
    `"${subtitle}"`,
    "-message",
    `"${message}"`,
    "-open",
    open,
    "-sound",
    sound,
    "-contentImage",
    contentImage,
    "-ignoreDnD",
  ].join(" ");

  try {
    await window.electronAPI.executeCommand(command);
  } catch (err: any) {
    console.error("Notification failed:", err.message);
  }
}

async function checkNewIssue(): Promise<void> {
  const authToken = localStorage.getItem("auth-token");
  const headers: Record<string, string> = {
    Authorization: `token ${authToken || ""}`,
    "User-Agent": "ping-expensify",
  };

  if (etag) headers["If-None-Match"] = etag;

  try {
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    console.log(time, "Checking for new issues...");

    const res = await window.electronAPI.ipcFetch(API_URL, { headers });

    if (res.status === 304) return;
    if (!res.ok) {
      console.error(`GitHub API error: ${res.statusText}`);
      return;
    }

    const issues = (await res.body) as GitHubIssue[];
    const latest = issues[0];

    if (latest && latest.id !== lastSeenId && latest.user.type !== "Bot") {
      lastSeenId = latest.id;
      await handleNewIssue(latest);
    }

    etag = res.headers["etag"] || etag;
  } catch (err: any) {
    console.error("Request failed:", err.message);
  }
}

export const startIssueChecking = () => {
  checkNewIssue();
  setInterval(checkNewIssue, 5000);
};
