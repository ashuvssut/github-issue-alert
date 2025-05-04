import { components } from "@octokit/openapi-types";
import { useEffect, useMemo, useState } from "react";
import { useAtom } from "jotai";
import { configAtom } from "./Header";
import { atomWithStorage } from "jotai/utils";
import { toast } from "react-toastify";
import { useRef } from "react";
import orderBy from "lodash.orderby";

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

export const useNotifications = () => {
  const [notifications, setNotifications] = useAtom(notificationsAtom);

  const { config, repo, getIssues, getRepoOwnerInfo, issuesByCreatedAtLink } =
    useGitHubApi();

  const ownerInfo = useRef<GitHubOwner | null>(null);
  useEffect(() => {
    getRepoOwnerInfo().then((res) => {
      if (res) ownerInfo.current = res.body.owner;
    });
    return () => {
      ownerInfo.current = null;
    };
  }, [config.repo]);

  async function handleNewIssue(latestIssue: GitHubIssueAndPR) {
    try {
      // const command = createTerminalNotifierCommand(latestIssue, ownerInfo);
      // const { error } = await window.electronAPI.executeCommand(command);
      // if (error) throw new Error(error);

      const isSameRepo = latestIssue.html_url.startsWith(
        ownerInfo.current?.html_url
      );
      if (!isSameRepo) {
        const newOwnerInfo = await getRepoOwnerInfo();
        ownerInfo.current = newOwnerInfo?.body.owner || null;
      }

      const repoSlug = getRepoSlug(latestIssue.repository_url);
      const bodyPrefix =
        window.electronAPI.platform !== "darwin" ? `${repoSlug}\n` : ""; // on macOS, we use subtitle to show repoName instead

      const labels = latestIssue.labels
        .map((label) => (typeof label === "string" ? label : label.name))
        .join(", ");
      const bodySuffix = labels.length > 0 ? ` | ${labels}` : "";

      window.electronAPI.showIssueNotification({
        title: latestIssue.title,
        body: `${bodyPrefix}${latestIssue.user.login}${bodySuffix}`,
        subtitle: repoSlug,
        openUrl: latestIssue.html_url,
        issuesByCreatedAtLink,
        iconUrl: ownerInfo.current?.avatar_url,
      });
    } catch (err: any) {
      console.error("Notification failed:", err.message);
      setNotifications((prev) => ({
        ...prev,
        error: `System Notification failed: ${err.message}`,
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
      const res = await getIssues();
      if (res.status === 304) {
        setNotifications((p) => ({ ...p, error: null }));
        return;
      }

      if (!res.ok) throw new Error(`GitHub API error: ${res.statusText}`);

      const nonBotIssuesOnly = res.body.filter(
        (issue) => !issue.pull_request && issue.user.type !== "Bot"
      );

      const latest = nonBotIssuesOnly[0];
      if (!latest) {
        setNotifications((p) => ({ ...p, error: null }));
        return;
      }

      setNotifications((p) => {
        const isAlreadyPresent = p.list.some((issue) => issue.id === latest.id);
        if (isAlreadyPresent) return { ...p, error: null };

        const newSortedByCreatedAt = orderBy(
          [...p.list, latest],
          [
            (item) => (item.repository_url === latest.repository_url ? 0 : 1), // priority: same repo first
            (item) => new Date(item.created_at).getTime(), // then by created_at desc
          ],
          ["asc", "desc"]
        );
        // update etag
        etag = res.headers["etag"] || etag;

        // notify outside state update
        handleNewIssue(latest);

        return { ...p, list: newSortedByCreatedAt, error: null };
      });
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
    if (!notifications.isRunning)
      toast.success("Polling initiated", { toastId: "p-start" });
  };

  const stopIssueChecking = () => {
    clearInterval(notifications.sessionId);
    setNotifications((prev) => ({ ...prev, isRunning: false, loading: false }));
    if (notifications.isRunning)
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
    checkNewIssue,
    deleteNotification,
    clearHistory,
    repo,
    issuesByCreatedAtLink,
  };
};

let etag: string | null = null;
const useGitHubApi = () => {
  const [config] = useAtom(configAtom);
  const [owner, repoName] = useMemo(() => {
    if (!config.repo) return ["", ""];
    try {
      const url = new URL(config.repo);
      const [owner, repoName] = url.pathname.slice(1).split("/");
      return [owner, repoName];
    } catch (err) {
      return ["", ""];
    }
  }, [config.repo]);

  const getIssues = async () => {
    const authToken = config.token;
    const headers: Record<string, string> = { "User-Agent": "ping-gh-repo" };
    if (authToken) headers.Authorization = `token ${authToken}`;
    if (etag) headers["If-None-Match"] = etag;
    const res = await window.electronAPI.ipcFetch(
      `https://api.github.com/repos/${owner}/${repoName}/issues?sort=created&direction=desc`,
      { headers }
    );
    return {
      ...res,
      body: res.body as GitHubIssueAndPR[],
    };
  };

  const getRepoOwnerInfo = async () => {
    if (!owner || !repoName) return null;
    const authToken = config.token;
    const headers: Record<string, string> = { "User-Agent": "ping-gh-info" };
    if (authToken) headers.Authorization = `token ${authToken}`;
    try {
      const res = await window.electronAPI.ipcFetch(
        `https://api.github.com/repos/${owner}/${repoName}`,
        { headers }
      );
      if (!res.ok) throw new Error(`GitHub API error: ${res.statusText}`);

      return {
        ...res,
        body: res.body as { owner: GitHubOwner },
      };
    } catch (error) {
      console.error("Failed to get repo info", error);
    }
  };

  const issuesByCreatedAtLink = `https://github.com/${owner}/${repoName}/issues?q=is%3Aissue%20is%3Aopen%20%20sort%3Acreated-desc`;
  return {
    getIssues,
    getRepoOwnerInfo,
    repo: { url: config.repo, owner, name: repoName },
    config,
    issuesByCreatedAtLink,
  };
};

export const getRepoSlug = (repository_url: string) => {
  const [owner, repo] = repository_url.split("/").slice(-2);
  return `${owner}/${repo}`;
};

const createTerminalNotifierCommand = (
  issue: GitHubIssueAndPR,
  ownerInfo: GitHubOwner
) => {
  const labels = issue.labels
    .map((label) => (typeof label === "string" ? label : label.name))
    .join(", ");

  const notification = {
    id: issue.id,
    group: "issue-alert",
    title: issue.title,
    subtitle: `${issue.user.login} | ${labels}`,
    message: issue.body?.substring(0, 200) || "(no description)",
    open: issue.html_url,
    sound: "default",
    contentImage: ownerInfo?.avatar_url || "",
  };

  const command = ["terminal-notifier", "-ignoreDnD"];
  Object.entries(notification).forEach(([key, value]) => {
    command.push(`-${key}`, `"${value}"`);
  });

  return command.join(" ");
};
/**
  const ZAP_URL = "https://hooks.zapier.com/hooks/catch/22546727/2x2oxt0/";
  async function handleNewIssue(latestIssue: GitHubIssue): Promise<void> {
    // Send data to Zapier webhook
    await fetch(ZAP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: latest.number,
        title: latest.title,
        url: latest.html_url,
      }),
    });
 */
