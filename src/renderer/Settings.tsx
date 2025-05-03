import TroubleshootIcon from "@mui/icons-material/Troubleshoot";
import SettingsIcon from "@mui/icons-material/Settings";
import Box from "@mui/material/Box";
import Fab from "@mui/material/Fab";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import { useState } from "react";
import { useAtom } from "jotai";
import { settingsAtom } from "./atoms";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import IconButton from "@mui/material/IconButton";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputLabel from "@mui/material/InputLabel";
import InputAdornment from "@mui/material/InputAdornment";
import FormControl from "@mui/material/FormControl";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useCopyToClipboard } from "@uidotdev/usehooks";
import { toast } from "react-toastify";

export const Settings = () => {
  const [open, setOpen] = useState(false);

  const toggleDrawer =
    (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
      if (
        event &&
        event.type === "keydown" &&
        ((event as React.KeyboardEvent).key === "Tab" ||
          (event as React.KeyboardEvent).key === "Shift")
      ) {
        return;
      }

      setOpen(open);
    };

  return (
    <>
      <Fab
        color="primary"
        sx={{ position: "fixed", bottom: 16, right: 16 }}
        onClick={toggleDrawer(true)}
      >
        <SettingsIcon fontSize="medium" />
      </Fab>
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onClose={toggleDrawer(false)}
        onOpen={toggleDrawer(true)}
      >
        <Box sx={{ p: 2, height: "70vh" }} role="presentation">
          <SettingsContent />
        </Box>
      </SwipeableDrawer>
    </>
  );
};

const getCodesignCmd = (appPath = "path/to/GitHub Issue Alert.app") =>
  `codesign --deep --force --sign - "${appPath}"`;

const SettingsContent = () => {
  const [settings, setSettings] = useAtom(settingsAtom);

  const [, copyToClipboard] = useCopyToClipboard();

  const platform = window.electronAPI.platform;
  return (
    <>
      <Typography
        variant="h6"
        gutterBottom
        display="flex"
        alignItems="center"
        gap={1}
      >
        <SettingsIcon /> Settings
      </Typography>
      <Stack mb={2}>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={settings.theme === "dark"}
                onChange={(e) =>
                  setSettings((p) => ({
                    ...p,
                    theme: e.target.checked ? "dark" : "light",
                  }))
                }
              />
            }
            label="Dark mode"
          />
        </FormGroup>
      </Stack>

      {platform === "darwin" && (
        <>
          <Typography
            variant="h6"
            gutterBottom
            display="flex"
            alignItems="center"
            gap={1}
          >
            <TroubleshootIcon />
            macOS Troubleshooting
          </Typography>
          <Typography variant="body2" gutterBottom>
            If some features like notifications aren't working, run the
            following command in your terminal and restart the app.
          </Typography>
          <FormControl variant="outlined" fullWidth>
            <InputLabel htmlFor="notif-troubleshooting">
              {getCodesignCmd()}
            </InputLabel>
            <OutlinedInput
              id="notif-troubleshooting"
              type="text"
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    onClick={async () => {
                      let exePath = await window.electronAPI.appGetPath("exe");
                      if (!exePath) return copyToClipboard(getCodesignCmd());

                      exePath = exePath.split("/Contents/")[0];
                      copyToClipboard(getCodesignCmd(exePath));

                      toast.success("Copied to clipboard", { toastId: "copy" });
                    }}
                    edge="end"
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </InputAdornment>
              }
              label="Password"
            />
          </FormControl>
        </>
      )}
    </>
  );
};
