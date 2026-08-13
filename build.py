import json
import os
import zipfile

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
EXT_DIR = os.path.join(ROOT_DIR, "wsmud2-browser-ext")
MANIFEST_PATH = os.path.join(EXT_DIR, "manifest.json")


def get_version():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    return manifest["version"]


def build_zip(version):
    zip_name = f"wsmud2-browser-ext-{version}.zip"
    zip_path = os.path.join(ROOT_DIR, zip_name)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(EXT_DIR):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, EXT_DIR)
                zf.write(file_path, arcname)

    print(f"Build complete: {zip_path}")
    return zip_path


if __name__ == "__main__":
    version = get_version()
    print(f"Version: {version}")
    build_zip(version)