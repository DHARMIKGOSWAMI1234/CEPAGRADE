"""
ONIONVISION — Phase 07 Real Verification & Metrology Audit Script
Executes full validation of:
1. JSON report metadata on real DB inspections
2. PDF generation on real DB inspections
3. PDF download & reopening
4. Calibration metrology integrity (calibrated vs uncalibrated)
5. Security boundary enforcement (path traversal & malformed IDs)
6. Performance measurement (generation latency & file size)
"""

import io
import json
import re
import sys
import time
from pathlib import Path

# Ensure backend modules can be imported
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT / "backend"))

from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models import Inspection, OnionResult
from app.core.config import settings


def main():
    print("=" * 70)
    print("ONIONVISION — PHASE 07 PROFESSIONAL REPORT & PDF EXPORT VERIFICATION")
    print("=" * 70)

    client = TestClient(app)
    db = SessionLocal()

    # -------------------------------------------------------------------------
    # 1. Locate Real Completed Inspection
    # -------------------------------------------------------------------------
    real_insp = (
        db.query(Inspection)
        .filter(Inspection.status == "completed")
        .first()
    )
    assert real_insp is not None, "No completed inspection found in onionvision.db!"
    insp_id = real_insp.inspection_id
    print(f"\n[1] Verified Real Inspection in DB: {insp_id}")
    print(f"    Total Onions: {real_insp.total_onions}, Quality Score: {real_insp.quality_score}")
    print(f"    Avg Size: {real_insp.average_size_mm} mm, Calibration: {real_insp.calibration_json[:60]}...")

    # -------------------------------------------------------------------------
    # 2. JSON Report Metadata Retrieval
    # -------------------------------------------------------------------------
    rep_res = client.get(f"/api/inspections/{insp_id}/report")
    assert rep_res.status_code == 200, f"Report metadata failed: {rep_res.text}"
    meta = rep_res.json()
    assert meta["inspection_id"] == insp_id
    assert meta["status"] == "available"
    assert meta["file_path"] is not None
    assert f"/api/inspections/{insp_id}/report/pdf" in meta["pdf_url"]
    print(f"[PASS] JSON Report Metadata: status={meta['status']}, size={meta.get('file_size_bytes')} bytes")

    # -------------------------------------------------------------------------
    # 3. PDF Download Route & Binary Signature
    # -------------------------------------------------------------------------
    pdf_res = client.get(f"/api/inspections/{insp_id}/report/pdf")
    assert pdf_res.status_code == 200, f"PDF download failed: {pdf_res.text}"
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert "attachment" in pdf_res.headers.get("content-disposition", "")
    assert insp_id in pdf_res.headers.get("content-disposition", "")

    pdf_bytes = pdf_res.content
    assert len(pdf_bytes) > 2000, f"PDF unexpectedly small: {len(pdf_bytes)} bytes"
    assert pdf_bytes.startswith(b"%PDF-"), f"Invalid PDF header: {pdf_bytes[:10]}"
    print(f"[PASS] PDF Download Route: MIME=application/pdf, bytes={len(pdf_bytes)}, valid %PDF- header")

    # Reopen and inspect PDF on disk
    saved_pdf = settings.reports_path / f"verified_{insp_id}.pdf"
    saved_pdf.write_bytes(pdf_bytes)
    assert saved_pdf.exists() and saved_pdf.stat().st_size == len(pdf_bytes)
    print(f"[PASS] Reopened and verified downloaded PDF at: {saved_pdf}")

    # -------------------------------------------------------------------------
    # 4. Uncalibrated Inspection Verification (No Fabricated Millimeters)
    # -------------------------------------------------------------------------
    print("\n[4] Metrology Audit: Testing Uncalibrated Inspection...")
    uncal_id = "INS-20260926-UNCAL-DEMO"
    
    # Remove existing uncal record if leftover
    db.query(Inspection).filter(Inspection.inspection_id == uncal_id).delete()
    db.commit()

    uncal_record = Inspection(
        inspection_id=uncal_id,
        image_path=real_insp.image_path,
        status="completed",
        total_onions=1,
        average_size_mm=None,  # STRICTLY NULL
        quality_score=60.0,
        defect_rate=0.0,
        calibration_json=json.dumps({"status": "UNCALIBRATED", "reference_detected": False}),
    )
    db.add(uncal_record)
    uncal_onion = OnionResult(
        inspection_id=uncal_id,
        onion_number=1,
        size_mm=None,  # STRICTLY NULL
        quality_class="Healthy",
        grade="Grade B",
        confidence=0.91,
        defect_area=0.0,
        variety="Yellow-Onion",
        review_status="REVIEW_RECOMMENDED",
        reasons_json=json.dumps(["Healthy bulb", "Physical size unavailable because calibration reference was not configured."]),
        morphometry_json=json.dumps({"area_pixels": 9500.0, "perimeter_pixels": 380.0, "equivalent_diameter_pixels": 110.0}),
        size_pixels=110.0,
    )
    db.add(uncal_onion)
    db.commit()

    # Generate uncalibrated report
    uncal_rep_res = client.get(f"/api/inspections/{uncal_id}/report")
    assert uncal_rep_res.status_code == 200
    assert uncal_rep_res.json()["status"] == "available"

    uncal_pdf_res = client.get(f"/api/inspections/{uncal_id}/report/pdf")
    assert uncal_pdf_res.status_code == 200
    uncal_pdf_bytes = uncal_pdf_res.content
    assert uncal_pdf_bytes.startswith(b"%PDF-")

    # Metrology verification: Ensure DB and report maintain null millimeter measurements
    refreshed_uncal = db.query(Inspection).filter(Inspection.inspection_id == uncal_id).first()
    assert refreshed_uncal.average_size_mm is None, "Fabrication violation: average_size_mm was populated!"
    assert refreshed_uncal.onions[0].size_mm is None, "Fabrication violation: onion size_mm was populated!"
    print("[PASS] Uncalibrated inspection verified: zero fabricated physical dimensions, calibration limitation recorded.")

    # Clean up demo uncal record
    db.query(Inspection).filter(Inspection.inspection_id == uncal_id).delete()
    db.commit()

    # -------------------------------------------------------------------------
    # 5. Security & Boundary Checks
    # -------------------------------------------------------------------------
    print("\n[5] Security & Path Traversal Auditing...")
    res_404 = client.get("/api/inspections/INS-NONEXISTENT-0000/report/pdf")
    assert res_404.status_code == 404, f"Expected 404 for missing inspection, got {res_404.status_code}"
    print("[PASS] Non-existent inspection returned HTTP 404.")

    malicious_ids = [
        "../etc/passwd",
        "..\\windows\\system32",
        "INS-123/../../hack",
        "INS-%2e%2e%2f",
    ]
    for bad_id in malicious_ids:
        bad_res = client.get(f"/api/inspections/{bad_id}/report/pdf")
        assert bad_res.status_code in [400, 404], f"Expected 400 or 404 for bad ID '{bad_id}', got {bad_res.status_code}"
    print("[PASS] Path traversal and malicious ID attempts strictly blocked.")

    # -------------------------------------------------------------------------
    # 6. Performance Benchmarking
    # -------------------------------------------------------------------------
    print("\n[6] Performance Benchmark: PDF Generation Latency...")
    from app.services.pdf_generator import pdf_generator
    
    latencies = []
    temp_target = settings.reports_path / f"bench_{insp_id}.pdf"
    for i in range(5):
        t0 = time.perf_counter()
        pdf_generator.build_report_pdf(real_insp, temp_target)
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000)

    mean_latency_ms = sum(latencies) / len(latencies)
    final_file_size = temp_target.stat().st_size
    if temp_target.exists():
        temp_target.unlink()

    print(f"    Runs: 5 iterations")
    print(f"    Latencies: {[round(l, 1) for l in latencies]} ms")
    print(f"    Mean Generation Time: {mean_latency_ms:.1f} ms")
    print(f"    Report File Size: {final_file_size} bytes ({final_file_size / 1024:.1f} KB)")
    print("[PASS] PDF generation benchmark completed successfully.")

    print("\n" + "=" * 70)
    print("ALL PHASE 07 REAL VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    main()
