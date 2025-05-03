import PlayArrow from "@mui/icons-material/PlayArrow";
import Stop from "@mui/icons-material/Stop";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import { useEffect, useMemo, useState } from "react";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useNotifications } from "./useNotifications";
import { z } from "zod";
import { Refresh } from "@mui/icons-material";

export const getConfigSchema = (token?: string) => {
  const safeMinInterval = token ? 1 : 60;

  return z.object({
    token: z.string().optional(),
    repo: z
      .string()
      .url()
      .refine((url) => /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(url), {
        message:
          "Repo URL must be in the form https://github.com/{owner}/{repo}",
      }),
    interval: z.number().min(safeMinInterval, {
      message: `Interval must be ≥ ${safeMinInterval}s without a token. Use a personal access token for shorter intervals.`,
    }),
  });
};

export const configAtom = atomWithStorage("config", {
  token: "",
  repo: "",
  interval: 5,
});

export function Header() {
  const [config, setConfig] = useAtom(configAtom);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isValidConfig = useMemo(() => {
    const schema = getConfigSchema(config.token);
    const result = schema.safeParse(config);
    return result.success;
  }, [config]);

  const {
    lastChecked,
    isRunning,
    checkNewIssue,
    startIssueChecking,
    stopIssueChecking,
    loading,
    error,
  } = useNotifications();

  useEffect(() => {
    if (isValidConfig) startIssueChecking();
  }, [isValidConfig, config]);

  const handleChange = (id: string, rawValue: string) => {
    const updatedValue = id === "interval" ? Number(rawValue) : rawValue;

    setConfig((prev) => {
      const updatedConfig = { ...prev, [id]: updatedValue };

      const schema = getConfigSchema(updatedConfig.token);
      const result = schema.safeParse(updatedConfig);

      if (!result.success) {
        const newFieldErrors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          newFieldErrors[field] = issue.message;
        });
        setFieldErrors(newFieldErrors);
        stopIssueChecking();
      } else {
        setFieldErrors({});
        startIssueChecking();
      }

      return updatedConfig;
    });
  };

  const fields = [
    { id: "token", label: "Authorization Token", type: "text" },
    { id: "repo", label: "Repo URL", type: "url" },
    { id: "interval", label: "Polling Interval (s)", type: "number" },
  ] as const;

  return (
    <Paper>
      <Stack sx={{ gap: 2, py: 2 }}>
        <Container
          sx={{ display: "flex", gap: 2, px: 2, alignItems: "center" }}
        >
          {fields.map((field) => (
            <TextField
              key={field.id}
              id={field.id}
              label={field.label}
              variant="standard"
              type={field.type}
              value={config[field.id]}
              onChange={(e) => handleChange(e.target.id, e.target.value)}
              error={!!fieldErrors[field.id]}
              helperText={fieldErrors[field.id]}
              slotProps={
                field.id === "interval"
                  ? { htmlInput: { min: config.token ? 1 : 60 } }
                  : undefined
              }
            />
          ))}
        </Container>

        <Container
          sx={{ display: "flex", gap: 2, px: 2, alignItems: "center" }}
        >
          <Button
            variant="outlined"
            loadingPosition="end"
            startIcon={isRunning ? <Stop /> : <PlayArrow />}
            onClick={() => {
              isRunning ? stopIssueChecking() : startIssueChecking();
            }}
          >
            {isRunning ? "Stop" : "Start"}
          </Button>
          <Tooltip title="Polling status">
            <Chip
              label={
                <>
                  <b>Status:</b> {isRunning ? "Active" : "Stopped"}
                </>
              }
              color={isRunning ? "success" : "default"}
              variant="filled"
            />
          </Tooltip>
        </Container>

        <Container
          sx={{ display: "flex", gap: 2, px: 2, alignItems: "center" }}
        >
          <Button
            variant="text"
            loadingPosition="end"
            startIcon={<Refresh />}
            onClick={checkNewIssue}
          >
            Refresh
          </Button>
          {lastChecked && <Typography>Last checked: {lastChecked}</Typography>}
          {loading && (
            <>
              <CircularProgress size={20} />
              <Typography>Checking...</Typography>
            </>
          )}
        </Container>

        {error && (
          <Typography color="error" sx={{ px: 4, fontSize: 13 }}>
            {error}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
