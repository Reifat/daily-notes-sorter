import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";

function ensureDir(p) {
	if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dst) {
	fs.copyFileSync(src, dst);
}

function main() {
	const cwd = process.cwd();
	const manifestPath = path.join(cwd, "manifest.json");

	if (!fs.existsSync(manifestPath)) {
		console.error("manifest.json not found in repository root");
		process.exit(1);
	}

	const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
	const pluginId = manifest.id;
	const pluginVersion = manifest.version;

	if (!pluginId || !pluginVersion) {
		console.error("Fields 'id' and/or 'version' are missing in manifest.json");
		process.exit(1);
	}

	const releaseDir = path.join(cwd, "release");
	ensureDir(releaseDir);

	// Files to include. styles.css is optional.
	const sourceFiles = [
		{ name: "main.js", required: true },
		{ name: "manifest.json", required: true },
		{ name: "styles.css", required: false }
	];

	const filesToZip = [];
	for (const f of sourceFiles) {
		const src = path.join(cwd, f.name);
		if (!fs.existsSync(src)) {
			if (f.required) {
				console.error(`Required file is missing: ${f.name}`);
				process.exit(1);
			} else {
				console.warn(`Optional file is missing and will be skipped: ${f.name}`);
				continue;
			}
		}
		const dst = path.join(releaseDir, path.basename(f.name));
		copyFile(src, dst);
		filesToZip.push(dst);
	}

	if (filesToZip.length === 0) {
		console.error("No files to pack");
		process.exit(1);
	}

	// Archive name: <id>-<version>.zip
	const zipName = `${pluginId}-${pluginVersion}.zip`;
	const zipPath = path.join(releaseDir, zipName);

	// Remove existing archive if present
	if (fs.existsSync(zipPath)) {
		fs.unlinkSync(zipPath);
	}

	const output = fs.createWriteStream(zipPath);
	const archive = archiver("zip", { zlib: { level: 9 } });

	output.on("close", () => {
		console.log(`Archive ready: ${zipPath} (${archive.pointer()} total bytes)`);
	});
	output.on("error", (err) => {
		console.error(err);
		process.exit(1);
	});
	archive.on("error", (err) => {
		console.error(err);
		process.exit(1);
	});

	archive.pipe(output);

	// Put files into the root of the archive
	for (const filePath of filesToZip) {
		archive.file(filePath, { name: path.basename(filePath) });
	}

	archive.finalize();
}

main();