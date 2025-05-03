import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import { getRepoName, useNotifications } from "./useNotifications";
import Delete from "@mui/icons-material/Delete";
import OpenInNew from "@mui/icons-material/OpenInNew";
import { useAtom } from "jotai";
import { getContrastColors } from "./utils";
import { settingsAtom } from "./atoms";
import { Fragment } from "react";

export const NotificationDisplay = () => {
  const { history, deleteNotification, clearHistory, issuesByCreatedAtLink } =
    useNotifications();
  const [settings, setSettings] = useAtom(settingsAtom);

  return (
    <Stack sx={{ mt: 2, px: 3, height: "100%", gap: 2, minHeight: "100vh" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" mr={1}>
          History
        </Typography>
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            window.electronAPI.openUrl(issuesByCreatedAtLink);
          }}
        >
          <OpenInNew />
        </IconButton>
        <Button onClick={clearHistory} sx={{ ml: "auto", mr: 2 }}>
          Clear All
        </Button>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={settings.compactView}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, compactView: e.target.checked }))
                }
                size="small"
              />
            }
            label="Compact"
          />
        </FormGroup>
      </Box>
      <Stack sx={{ height: "100%", gap: 2, overflow: "auto" }}>
        {history.map((ghIssue, i) => {
          const createdAt = new Date(ghIssue.created_at).toLocaleString(
            "en-US",
            {
              day: "2-digit",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
              weekday: "short",
            }
          );

          const repoName = getRepoName(ghIssue.repository_url);
          const showDivider =
            i == 0 || ghIssue.repository_url !== history[i - 1]?.repository_url;
          return (
            <Fragment key={ghIssue.id}>
              {showDivider && (
                <Box display="flex" alignItems="center">
                  <Chip label={repoName} size="small" />
                  <Divider sx={{ flex: 1, ml: 2 }} />
                </Box>
              )}
              <Tooltip title={`Open ${ghIssue.html_url}`}>
                <Card
                  onClick={() => window.electronAPI.openUrl(ghIssue.html_url)}
                  sx={{
                    cursor: "pointer",
                    minHeight: "fit-content",
                    display: "inline-flex",
                    alignItems: "center",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    bgcolor: "background.paper",
                    gap: 1,
                    pr: 1,
                  }}
                >
                  <CardContent
                    sx={{ maxWidth: "calc(100% - 2 * 8px - 40px)", mr: "auto" }}
                  >
                    <Typography
                      gutterBottom
                      variant="subtitle1"
                      fontWeight={600}
                    >
                      {ghIssue.title}
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      sx={{ color: "text.secondary" }}
                      gap={1}
                      display="flex"
                      alignItems="center"
                      gutterBottom
                    >
                      {createdAt} | {ghIssue.user.login}
                      {ghIssue.labels.length > 0 && " | "}
                      {ghIssue.labels.map((l) => {
                        if (typeof l === "string") return l;
                        return (
                          <Chip
                            key={l.id}
                            label={l.name}
                            variant="outlined"
                            sx={getContrastColors(l.color)}
                            onClick={() => window.electronAPI.openUrl(l.url)}
                          />
                        );
                      })}
                    </Typography>
                    {!settings.compactView && ghIssue.body && (
                      <Typography
                        variant="body2"
                        sx={{
                          display: "-webkit-box",
                          overflow: "hidden",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                          color: "text.secondary",
                        }}
                      >
                        {ghIssue.body}
                      </Typography>
                    )}
                  </CardContent>
                  <Divider orientation="vertical" variant="middle" flexItem />
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(ghIssue.id);
                    }}
                  >
                    <Delete />
                  </IconButton>
                </Card>
              </Tooltip>
            </Fragment>
          );
        })}

        {history.length === 0 && (
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            No notifications
          </Typography>
        )}
      </Stack>
    </Stack>
  );
};
