import { components } from "@octokit/openapi-types";
import { useEffect, useMemo, useState } from "react";
import { useAtom } from "jotai";
import { configAtom } from "./Header";
import { atomWithStorage } from "jotai/utils";
import { toast } from "react-toastify";

const getIssuesApiUrl = (owner: string, repo: string): string =>
  `https://api.github.com/repos/${owner}/${repo}/issues?sort=created&direction=desc&per_page=1`;

type GitHubIssueAndPR = components["schemas"]["issue"];
type GitHubOwner = components["schemas"]["repository"]["owner"];

const notificationsAtom = atomWithStorage("notifications", {
  sessionId: null,
  list: [] as GitHubIssueAndPR[],
  error: null as string | null,
  loading: false,
  lastChecked: null as number | null,
  isRunning: false,
});

let etag: string | null = null;

export const useNotifications = () => {
  const [notifications, setNotifications] = useAtom(notificationsAtom);
  const [config] = useAtom(configAtom);
  const [owner, repoName] = useMemo(() => {
    if (!config.repo) return ["", ""];
    const url = new URL(config.repo);
    const [owner, repoName] = url.pathname.slice(1).split("/");
    return [owner, repoName];
  }, [config.repo]);

  const getRepoOwnerInfo = async () => {
    const authToken = config.token;
    const headers: Record<string, string> = { "User-Agent": "ping-gh-info" };
    if (authToken) headers.Authorization = `token ${authToken}`;
    try {
      const res = await window.electronAPI.ipcFetch(
        `https://api.github.com/repos/${owner}/${repoName}`,
        { headers }
      );
      if (!res.ok) throw new Error(`GitHub API error: ${res.statusText}`);

      const repo = res.body as { owner: GitHubOwner };
      return repo.owner;
    } catch (error) {
      console.error("Failed to get repo info", error);
    }
  };
  const [ownerInfo, setOwnerInfo] = useState<GitHubOwner | null>(null);
  useEffect(() => {
    getRepoOwnerInfo().then(setOwnerInfo);
    return () => setOwnerInfo(null);
  }, [config.repo]);

  const createNotificationData = (ghIssue: GitHubIssueAndPR) => {
    const labels = ghIssue.labels
      .map((label) => (typeof label === "string" ? label : label.name))
      .join(", ");

    const notification = {
      id: ghIssue.id,
      group: "issue-alert",
      title: ghIssue.title,
      subtitle: `${ghIssue.user.login} | ${labels}`,
      message: ghIssue.body?.substring(0, 200) || "(no description)",
      open: ghIssue.html_url,
      sound: "default",
      contentImage: ownerInfo?.avatar_url || "",
    };

    return notification;
  };

  async function handleNewIssue(latestIssue: GitHubIssueAndPR) {
    const notification = createNotificationData(latestIssue);

    const command = ["terminal-notifier", "-ignoreDnD"];
    Object.entries(notification).forEach(([key, value]) => {
      command.push(`-${key}`, `"${value}"`);
    });

    try {
      await window.electronAPI.executeCommand(command.join(" "));
    } catch (err: any) {
      console.error("Notification failed:", err.message);
      setNotifications((prev) => ({
        ...prev,
        error: `Notification failed: ${err.message}`,
      }));
    }
  }

  const checkNewIssue = async () => {
    setNotifications((p) => ({
      ...p,
      lastChecked: Date.now(),
      loading: true,
    }));

    try {
      const authToken = config.token;
      const headers: Record<string, string> = {
        "User-Agent": "ping-gh-repo",
      };
      if (authToken) headers.Authorization = `token ${authToken}`;
      if (etag) headers["If-None-Match"] = etag;
      const res = await window.electronAPI.ipcFetch(
        getIssuesApiUrl(owner, repoName),
        { headers }
      );
      if (res.status === 304) {
        setNotifications((p) => ({ ...p, error: null }));
        return;
      }

      if (!res.ok) {
        throw new Error(`GitHub API error: ${res.statusText}`);
      }

      const results = res.body as GitHubIssueAndPR[];
      const issuesOnly = results.filter((issue) => !issue.pull_request);
      const latest = issuesOnly[0];

      const isAlreadyPresent = notifications.list.some(
        (issue) => issue.id === latest?.id
      );

      if (latest && !isAlreadyPresent && latest.user.type !== "Bot") {
        const newSortedByCreatedAt = [...notifications.list, latest].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setNotifications((p) => ({ ...p, list: newSortedByCreatedAt }));

        etag = res.headers["etag"] || etag;
        await handleNewIssue(latest);
      }

      setNotifications((p) => ({ ...p, error: null }));
    } catch (err: any) {
      console.error("Request failed:", err.message);
      setNotifications((p) => ({
        ...p,
        error: `Request failed: ${err.message}`,
      }));
    } finally {
      setNotifications((p) => ({ ...p, loading: false }));
    }
  };

  const startIssueChecking = () => {
    if (notifications.sessionId) clearInterval(notifications.sessionId);
    const sessionId = setInterval(checkNewIssue, config.interval * 1000);
    setNotifications((prev) => ({
      ...prev,
      sessionId,
      isRunning: true,
    }));
    toast.success("Polling initiated", { toastId: "p-start" });
  };

  const stopIssueChecking = () => {
    clearInterval(notifications.sessionId);
    setNotifications((prev) => ({ ...prev, isRunning: false, loading: false }));
    toast.info("Polling stopped", { toastId: "p-stop" });
  };

  const lastChecked = useMemo(() => {
    if (!notifications.lastChecked) return null;
    const date = new Date(notifications.lastChecked);
    return date.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [notifications.lastChecked]);

  const deleteNotification = (id: number) => {
    setNotifications((prev) => ({
      ...prev,
      list: prev.list.filter((issue) => issue.id !== id),
    }));
    etag = null;
  };

  const clearHistory = () => {
    setNotifications((prev) => ({ ...prev, list: [] }));
    etag = null;
  };

  return {
    history: notifications.list,
    startIssueChecking,
    stopIssueChecking,
    lastChecked,
    isRunning: notifications.isRunning,
    error: notifications.error,
    loading: notifications.loading,
    createNotificationData,
    checkNewIssue,
    deleteNotification,
    clearHistory,
    repo: { url: config.repo, owner, name: repoName },
  };
};

/**
// const ZAP_URL = "https://hooks.zapier.com/hooks/catch/22546727/2x2oxt0/";
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
 */
