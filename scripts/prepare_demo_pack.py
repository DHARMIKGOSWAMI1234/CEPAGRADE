"""
ONIONVISION — Demo Image Pack Preparation (Phase 06)
Curates representative demonstration images into organized folders under data/demo/
and generates data/demo/DEMO_MANIFEST.json.

MANDATORY RULES:
- Never delete, move, or modify original dataset files.
- Copy images into data/demo/
- Document purpose, source dataset, and calibration availability without inventing metrics.
"""

from pathlib import Path
import shutil
import json

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent

def main():
    demo_root = WORKSPACE_ROOT / "data" / "demo"
    categories = [
        "01_single_onion",
        "02_multiple_onions",
        "03_reference_calibration",
        "04_healthy",
        "05_unhealthy",
        "06_difficult_cluster",
        "07_dataset3_external",
    ]

    for cat in categories:
        (demo_root / cat).mkdir(parents=True, exist_ok=True)

    manifest_entries = []

    # 1. Single Onion
    src1 = WORKSPACE_ROOT / "data" / "processed" / "segmentation" / "images" / "test" / "IMG_E2607_JPG.rf.499cd4da9549314827488961f04f4caf.jpg"
    if src1.exists():
        dst1 = demo_root / "01_single_onion" / "demo_single_onion.jpg"
        shutil.copy2(src1, dst1)
        manifest_entries.append({
            "category": "01_single_onion",
            "filename": "demo_single_onion.jpg",
            "source_dataset": "Dataset 1 (Roboflow Onion Segmentation v7)",
            "source_path": str(src1.relative_to(WORKSPACE_ROOT)),
            "purpose": "Demonstration of individual onion localization, boundary segmentation, and morphometry extraction.",
            "expected_behavior": "Single isolated onion segmented with high confidence; contour and bounding box derived.",
            "calibration_available": True,
        })

    # 2. Multiple Onions
    src2 = WORKSPACE_ROOT / "data" / "processed" / "segmentation" / "images" / "test" / "IMG_E2574_JPG.rf.409d37b8580066922c0da689075c548f.jpg"
    if src2.exists():
        dst2 = demo_root / "02_multiple_onions" / "demo_multiple_onions.jpg"
        shutil.copy2(src2, dst2)
        manifest_entries.append({
            "category": "02_multiple_onions",
            "filename": "demo_multiple_onions.jpg",
            "source_dataset": "Dataset 1 (Roboflow Onion Segmentation v7)",
            "source_path": str(src2.relative_to(WORKSPACE_ROOT)),
            "purpose": "Multi-instance batch inspection demonstrating simultaneous segmentation and batch analytics.",
            "expected_behavior": "Multiple distinct onion bulbs localized and extracted into individual crops.",
            "calibration_available": True,
        })

    # 3. Reference Calibration
    src3 = WORKSPACE_ROOT / "data" / "processed" / "segmentation" / "images" / "test" / "IMG_E2581_JPG.rf.dae5d0f16314711c91a7164a4c9b411a.jpg"
    if src3.exists():
        dst3 = demo_root / "03_reference_calibration" / "demo_reference_coin_calibration.jpg"
        shutil.copy2(src3, dst3)
        manifest_entries.append({
            "category": "03_reference_calibration",
            "filename": "demo_reference_coin_calibration.jpg",
            "source_dataset": "Dataset 1 (Roboflow Onion Segmentation v7)",
            "source_path": str(src3.relative_to(WORKSPACE_ROOT)),
            "purpose": "Physical scale calibration using a planar reference coin/disc to convert pixels into real millimetres.",
            "expected_behavior": "Reference disc detected; pixels_per_mm computed; bulb diameters reported in physical mm.",
            "calibration_available": True,
        })

    # 4. Healthy Bulb
    src4 = WORKSPACE_ROOT / "data" / "processed" / "classification" / "test" / "healthy"
    h_files = list(src4.glob("*.*"))
    if h_files:
        src4_file = h_files[0]
        dst4 = demo_root / "04_healthy" / f"demo_healthy_onion{src4_file.suffix}"
        shutil.copy2(src4_file, dst4)
        manifest_entries.append({
            "category": "04_healthy",
            "filename": dst4.name,
            "source_dataset": "Dataset 2 (Red & White Onion Bulbs and Leaves)",
            "source_path": str(src4_file.relative_to(WORKSPACE_ROOT)),
            "purpose": "Demonstrating high-confidence Healthy bulb classification using MobileNetV3-Small.",
            "expected_behavior": "Clean surface texture classified as Healthy; eligible for Grade A or B.",
            "calibration_available": False,
        })

    # 5. Unhealthy Bulb
    src5 = WORKSPACE_ROOT / "data" / "processed" / "classification" / "test" / "unhealthy"
    u_files = list(src5.glob("*.*"))
    if u_files:
        src5_file = u_files[0]
        dst5 = demo_root / "05_unhealthy" / f"demo_unhealthy_onion{src5_file.suffix}"
        shutil.copy2(src5_file, dst5)
        manifest_entries.append({
            "category": "05_unhealthy",
            "filename": dst5.name,
            "source_dataset": "Dataset 2 (Red & White Onion Bulbs and Leaves)",
            "source_path": str(src5_file.relative_to(WORKSPACE_ROOT)),
            "purpose": "Demonstrating surface defect / rotting detection and deterministic down-grading.",
            "expected_behavior": "Visible surface blemish classified as Unhealthy; grade capped at Grade C or Reject.",
            "calibration_available": False,
        })

    # 6. Difficult Cluster
    src6 = WORKSPACE_ROOT / "data" / "processed" / "segmentation" / "images" / "test" / "IMG_E2659_JPG.rf.aa57408108e035461d0318038ab9930b.jpg"
    if src6.exists():
        dst6 = demo_root / "06_difficult_cluster" / "demo_touching_cluster.jpg"
        shutil.copy2(src6, dst6)
        manifest_entries.append({
            "category": "06_difficult_cluster",
            "filename": "demo_touching_cluster.jpg",
            "source_dataset": "Dataset 1 (Roboflow Onion Segmentation v7)",
            "source_path": str(src6.relative_to(WORKSPACE_ROOT)),
            "purpose": "Evaluating instance separation performance when multiple bulbs are touching or occluded.",
            "expected_behavior": "YOLO polygon instance masks separate adjacent bulb boundaries.",
            "calibration_available": True,
        })

    # 7. Dataset 3 External Samples
    src7_dir = WORKSPACE_ROOT / "data" / "raw" / "dataset_03"
    for d3_file in sorted(src7_dir.glob("*.jpg")):
        dst7 = demo_root / "07_dataset3_external" / d3_file.name
        shutil.copy2(d3_file, dst7)
        manifest_entries.append({
            "category": "07_dataset3_external",
            "filename": d3_file.name,
            "source_dataset": "Dataset 3 (Harvard Dataverse Sample Set)",
            "source_path": str(d3_file.relative_to(WORKSPACE_ROOT)),
            "purpose": "External qualitative validation on unseen third-party produce sorting imagery.",
            "expected_behavior": "Expected behavior not predetermined; used for live inference.",
            "calibration_available": False,
        })

    # Write Manifest
    manifest_doc = {
        "version": "1.0.0",
        "created_phase": "Phase 06 Demo Hardening",
        "description": "Curated collection of representative real onion images for SIH live evaluation.",
        "total_images": len(manifest_entries),
        "categories": categories,
        "images": manifest_entries,
    }

    manifest_path = demo_root / "DEMO_MANIFEST.json"
    manifest_path.write_text(json.dumps(manifest_doc, indent=2), encoding="utf-8")
    print(f"Created demo image pack with {len(manifest_entries)} images.")
    print(f"Manifest saved to: {manifest_path}")

if __name__ == "__main__":
    main()
