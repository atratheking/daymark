const { app, BrowserWindow, Menu, dialog, session } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

// Keep the original profile so the product rename preserves existing tasks.
app.setPath("userData", path.join(app.getPath("appData"), "TickTick Study"));
app.setName("Daymark");
app.setAppUserModelId("app.daymark.desktop");
const entry = path.join(__dirname, "..", "dist", "index.html");
const entryURL = pathToFileURL(entry).href;
let mainWindow;

function dispatch(action) {
  const window = BrowserWindow.getFocusedWindow() || mainWindow;
  if (!window || window.isDestroyed()) return;
  window.webContents
    .executeJavaScript(
      `window.dispatchEvent(new CustomEvent('daymark:command', { detail: ${JSON.stringify(action)} }))`,
    )
    .catch(() => {});
}

function installMenu() {
  const mac = process.platform === "darwin";
  const template = [
    ...(mac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        { label: "New Task", accelerator: "CmdOrCtrl+N", click: () => dispatch("new-task") },
        { label: "Search Tasks", accelerator: "CmdOrCtrl+K", click: () => dispatch("search") },
        { type: "separator" },
        mac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Today", accelerator: "CmdOrCtrl+1", click: () => dispatch("today") },
        { label: "Next 7 Days", accelerator: "CmdOrCtrl+2", click: () => dispatch("next7") },
        { label: "Inbox", accelerator: "CmdOrCtrl+3", click: () => dispatch("inbox") },
        { label: "All Tasks", accelerator: "CmdOrCtrl+4", click: () => dispatch("all") },
        { label: "Tomorrow", accelerator: "CmdOrCtrl+5", click: () => dispatch("tomorrow") },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(mac ? [{ type: "separator" }, { role: "front" }] : [{ role: "close" }]),
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About Daymark",
          click: () =>
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Daymark",
              message: "Daymark",
              detail: "Daymark 0.1.0 — make room for what matters.",
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    title: "Daymark",
    ...(process.platform === "darwin"
      ? { titleBarStyle: "hidden", trafficLightPosition: { x: 12, y: 12 } }
      : {}),
    width: 1440,
    height: 940,
    minWidth: 1000,
    minHeight: 680,
    backgroundColor: "#ffffff",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.split("#")[0] !== entryURL) event.preventDefault();
  });
  mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  await mainWindow.loadFile(entry);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
  app
    .whenReady()
    .then(async () => {
      // This reconstruction has no cloud backend or permission-dependent features.
      session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
        callback(false),
      );
      session.defaultSession.setPermissionCheckHandler(() => false);
      session.defaultSession.webRequest.onBeforeRequest(
        { urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] },
        (_details, callback) => callback({ cancel: true }),
      );
      installMenu();
      await createWindow();
      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });
    })
    .catch((error) => {
      dialog.showErrorBox("Unable to open Daymark", error.message);
      app.quit();
    });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
