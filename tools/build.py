"""Create a runtime-only, deterministic store package."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import json
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / "manifest.json").read_text())
variant = "chromium" if "service_worker" in manifest["background"] else "firefox"
out = root / "dist" / f"Hide-Highlight-{variant}-{manifest['version']}.zip"
out.parent.mkdir(exist_ok=True)
files = [root / name for name in ["manifest.json", "popup.html", "LICENSE"]]
for directory in ["_locales", "scripts", "styles", "options"]:
    files.extend(p for p in (root / directory).rglob("*") if p.is_file())
files.extend((root / "images").glob("*.png"))
with ZipFile(out, "w", ZIP_DEFLATED, compresslevel=9) as archive:
    for p in sorted(files):
        info = ZipInfo(p.relative_to(root).as_posix(), (2026, 11, 2, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, p.read_bytes())
print(out)
