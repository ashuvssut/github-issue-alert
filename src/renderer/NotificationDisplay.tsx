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
import { useNotifications } from "./useNotifications";
import Delete from "@mui/icons-material/Delete";
import OpenInNew from "@mui/icons-material/OpenInNew";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";

const settingsAtom = atomWithStorage("settings", { compactView: false });
export const NotificationDisplay = () => {
  const { history, deleteNotification, clearHistory, repo } =
    useNotifications();
  const [settings, setSettings] = useAtom(settingsAtom);
  return (
    <Stack sx={{ mt: 2, px: 3, height: "100%", gap: 2, minHeight: "100vh" }}>
      <Box display="flex" justifyContent="space-between">
        <Typography variant="h4" mr={1}>
          History
        </Typography>
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            window.electronAPI.openUrl(
              `https://github.com/${repo.owner}/${repo.name}/issues?q=is%3Aissue%20is%3Aopen%20%20sort%3Acreated-desc`
            );
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
              />
            }
            label="Compact"
          />
        </FormGroup>
      </Box>
      <Stack sx={{ height: "100%", gap: 2, overflow: "auto" }}>
        {history.map((ghIssue) => {
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
          return (
            <Tooltip title={`Open ${ghIssue.html_url}`} key={ghIssue.id}>
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
                  <Typography gutterBottom variant="subtitle1" fontWeight={600}>
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
                    {createdAt} | {ghIssue.user.login} |{" "}
                    {ghIssue.labels.map((l) => {
                      if (typeof l === "string") return l;
                      return (
                        <Chip
                          key={l.id}
                          label={l.name}
                          variant="outlined"
                          sx={getLabelColors(l.color)}
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

function getLabelColors(hex: string) {
  // Parse hex string (without '#')
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Relative luminance
  const luminance = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;

  // Convert RGB to HSL
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  const saturation = Math.round(s * 100);
  let lightness = Math.round(l * 100);

  // Contrast boost if luminance < 0.6
  if (luminance < 0.6) {
    const boost = (0.6 - luminance) * 100;
    const boostFactor = Math.max(0, Math.min((luminance - 0.6) * -1000, 1));
    lightness += Math.round(boost * boostFactor);
  }

  const hsl = `hsl(${h}, ${saturation}%, ${lightness}%)`;

  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
    borderColor: hsl,
    color: hsl,
    height: "unset",
  };
}
