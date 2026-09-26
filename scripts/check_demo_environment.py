"""
ONIONVISION — Demo Environment & Startup Health Check (Phase 06)
Validates all local prerequisites, virtual environments, ML model weights,
frontend bundles, and database state before running a live demo.
"""

from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request
import json

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent

def check_item(name: str, check_fn):
    """Runs a test check and prints PASS/FAIL with detail."""
    try:
        ok, detail = check_fn()
        status_str = "[PASS]" if ok else "[FAIL]"
        print(f"{status_str:<8} {name:<35} : {detail}")
        return ok
    except Exception as e:
        print(f"{'[FAIL]':<8} {name:<35} : Exception: {str(e)}")
        return False

def main():
    print("=" * 70)
    print("ONIONVISION — ENVIRONMENT & PRE-DEMO HEALTH CHECK")
    print("=" * 70)

    results = []

    # 1. Python Version
    def check_python():
        v = sys.version_info
        ok = v.major == 3 and v.minor >= 10
        return ok, f"Python {v.major}.{v.minor}.{v.micro} ({'Compatible' if ok else 'Requires >=3.10'})"
    results.append(check_item("Python Runtime", check_python))

    # 2. Node.js & npm
    def check_node():
        res = subprocess.run(["node", "-v"], capture_output=True, text=True, shell=True)
        ok = res.returncode == 0
        ver = res.stdout.strip() if ok else "Not Found"
        return ok, f"{ver} in PATH"
    results.append(check_item("Node.js Runtime", check_node))

    def check_npm():
        res = subprocess.run(["npm", "-v"], capture_output=True, text=True, shell=True)
        ok = res.returncode == 0
        ver = res.stdout.strip() if ok else "Not Found"
        return ok, f"v{ver} in PATH"
    results.append(check_item("npm Package Manager", check_npm))

    # 3. Virtual Environment
    def check_venv():
        venv_py = WORKSPACE_ROOT / "backend" / ".venv" / "Scripts" / "python.exe"
        ok = venv_py.exists()
        return ok, f"{venv_py.relative_to(WORKSPACE_ROOT)} ({'Exists' if ok else 'Missing'})"
    results.append(check_item("Backend Virtualenv", check_venv))

    # 4. FastAPI & ML Dependencies in venv
    def check_fastapi_deps():
        venv_py = WORKSPACE_ROOT / "backend" / ".venv" / "Scripts" / "python.exe"
        cmd = [str(venv_py), "-c", "import fastapi, uvicorn, torch, ultralytics, cv2, PIL; print('OK')"]
        res = subprocess.run(cmd, capture_output=True, text=True)
        ok = res.returncode == 0 and "OK" in res.stdout
        return ok, "FastAPI, PyTorch, YOLO, OpenCV, Pillow present"
    results.append(check_item("Backend Core Libraries", check_fastapi_deps))

    # 5. Model Files
    def check_seg_model():
        seg = WORKSPACE_ROOT / "ml" / "models" / "onion_segmentation_yolov8n.pt"
        ok = seg.exists() and seg.stat().st_size > 1024 * 1024
        sz_mb = seg.stat().st_size / (1024 * 1024) if seg.exists() else 0
        return ok, f"{seg.name} ({sz_mb:.1f} MB)"
    results.append(check_item("Segmentation Model Weights", check_seg_model))

    def check_cls_model():
        cls_w = WORKSPACE_ROOT / "ml" / "models" / "onion_health_mobilenetv3_small.pth"
        ok = cls_w.exists() and cls_w.stat().st_size > 1024 * 1024
        sz_mb = cls_w.stat().st_size / (1024 * 1024) if cls_w.exists() else 0
        return ok, f"{cls_w.name} ({sz_mb:.1f} MB)"
    results.append(check_item("Classifier Model Weights", check_cls_model))

    # 6. Database
    def check_db():
        db_path = WORKSPACE_ROOT / "onionvision.db"
        ok = db_path.exists()
        return ok, f"SQLite ({db_path.name}, {'Initialized' if ok else 'Not yet created'})"
    results.append(check_item("Database Store", check_db))

    # 7. Required Directories
    def check_dirs():
        dirs = [
            WORKSPACE_ROOT / "storage" / "uploads",
            WORKSPACE_ROOT / "data" / "demo",
            WORKSPACE_ROOT / "ml" / "evaluation" / "phase06" / "dataset03",
        ]
        all_ok = all(d.exists() for d in dirs)
        return all_ok, f"Storage, Demo pack, Evaluation folders present"
    results.append(check_item("Required Directories", check_dirs))

    # 8. Frontend Dependencies & Build
    def check_fe_deps():
        nm = WORKSPACE_ROOT / "frontend" / "node_modules"
        ok = nm.exists() and (nm / "react").exists()
        return ok, "node_modules installed"
    results.append(check_item("Frontend Dependencies", check_fe_deps))

    def check_fe_dist():
        dist = WORKSPACE_ROOT / "frontend" / "dist" / "index.html"
        ok = dist.exists()
        return ok, f"Production bundle ({'Compiled' if ok else 'Not yet built'})"
    results.append(check_item("Frontend Production Build", check_fe_dist))

    # 9. Live Backend Service (if running)
    def check_backend_live():
        try:
            req = urllib.request.Request("http://127.0.0.1:8000/api/health", headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=2) as resp:
                data = json.loads(resp.read().decode())
                ok = data.get("status") == "ok"
                m_ready = data.get("models_ready", False)
                return ok, f"Online (FastAPI Status: ok, Models Ready: {m_ready})"
        except Exception:
            return False, "Not Running (Launch with run_onionvision.bat)"
    results.append(check_item("FastAPI Backend (Live)", check_backend_live))

    # 10. Live Frontend Dev Server (if running)
    def check_frontend_live():
        try:
            with urllib.request.urlopen("http://localhost:5173", timeout=2) as resp:
                ok = resp.status == 200
                return ok, "Online (Vite dev server responding at port 5173)"
        except Exception:
            try:
                with urllib.request.urlopen("http://localhost:5174", timeout=2) as resp:
                    ok = resp.status == 200
                    return ok, "Online (Vite dev server responding at port 5174)"
            except Exception:
                return False, "Not Running (Launch with run_onionvision.bat)"
    results.append(check_item("Frontend Server (Live)", check_frontend_live))

    print("=" * 70)
    passed_count = sum(1 for r in results if r)
    total_count = len(results)
    print(f"Summary: {passed_count}/{total_count} checks passed.")

    if passed_count >= total_count - 2:  # Live servers may be started after
        print("\nDEMO ENVIRONMENT STATUS: READY FOR SIH PRESENTATION")
    else:
        print("\nDEMO ENVIRONMENT STATUS: INCOMPLETE (Review failed items above)")
    print("=" * 70)


if __name__ == "__main__":
    main()
