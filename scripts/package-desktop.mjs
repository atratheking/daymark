import { packager } from "@electron/packager";
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2] || "all";
if (!["all", "mac", "win"].includes(target))
  throw new Error("Usage: node scripts/package-desktop.mjs [all|mac|win]");
await access(path.join(root, "dist", "index.html"));
const metadata = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const electronMetadata = JSON.parse(
  await readFile(path.join(root, "node_modules/electron/package.json"), "utf8"),
);
const staging = await mkdtemp(path.join(tmpdir(), "daymark-"));
const out = path.join(root, "releases");
await mkdir(out, { recursive: true });

try {
  // Copy only the runtime, never research screenshots, source app files, or local evidence.
  await cp(path.join(root, "dist"), path.join(staging, "dist"), { recursive: true });
  await cp(path.join(root, "electron"), path.join(staging, "electron"), { recursive: true });
  await writeFile(
    path.join(staging, "package.json"),
    JSON.stringify(
      {
        name: "daymark",
        productName: "Daymark",
        version: metadata.version || "0.1.0",
        description: "Daymark — make room for what matters",
        main: "electron/main.cjs",
        author: "Daymark",
        private: true,
      },
      null,
      2,
    ),
  );
  const targets = target === "all" ? ["mac", "win"] : [target];
  for (const platform of targets) {
    const mac = platform === "mac";
    const outputs = await packager({
      dir: staging,
      out,
      name: "Daymark",
      executableName: "Daymark",
      platform: mac ? "darwin" : "win32",
      arch: mac ? "arm64" : "x64",
      electronVersion: electronMetadata.version,
      appVersion: metadata.version || "0.1.0",
      appBundleId: "app.daymark.desktop",
      appCategoryType: "public.app-category.productivity",
      darwinDarkModeSupport: true,
      asar: true,
      overwrite: true,
      prune: false,
    });
    for (const directory of outputs) {
      const archive = `${directory}.zip`;
      await rm(archive, { force: true });
      if (mac && process.platform === "darwin") {
        await exec("ditto", [
          "-c",
          "-k",
          "--sequesterRsrc",
          "--keepParent",
          path.join(directory, "Daymark.app"),
          archive,
        ]);
      } else if (process.platform !== "win32") {
        await exec("zip", ["-q", "-r", "-y", archive, path.basename(directory)], {
          cwd: path.dirname(directory),
          maxBuffer: 1024 * 1024 * 8,
        });
      } else {
        console.log(`Packaged directory (archive manually): ${directory}`);
        continue;
      }
      console.log(`Packaged unsigned archive: ${archive}`);
    }
  }
} finally {
  await rm(staging, { recursive: true, force: true });
}
