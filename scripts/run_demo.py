"""
ONIONVISION — Demo Runner CLI (Phase 06)
Executes the real ONIONVISION computer vision inspection pipeline against
selected demo images or a specific image path.

Usage:
  python scripts/run_demo.py
  python scripts/run_demo.py --image data/demo/01_single_onion/demo_single_onion.jpg
"""

import argparse
from pathlib import Path
import sys
import time

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT / "backend"))

from app.cv.pipeline import cv_pipeline
from app.db.database import SessionLocal, init_db
from app.services.inspection_service import inspection_service
from app.core.config import settings


def run_single_image(img_path: Path, reference_diameter_mm: float = 25.0):
    """Executes the full pipeline and records inspection in database."""
    print("-" * 65)
    print(f"Target Image: {img_path.name}")
    print(f"Path: {img_path}")

    if not img_path.exists():
        print(f"[ERROR] Image file does not exist: {img_path}")
        return

    # Generate inspection ID
    inspection_id = inspection_service.generate_inspection_id()

    t0 = time.perf_counter()
    # Run through the real CV pipeline
    res = cv_pipeline.process(
        image_input=img_path,
        known_reference_diameter_mm=reference_diameter_mm,
        output_dir=settings.upload_path,
        inspection_id=inspection_id,
    )
    elapsed_ms = (time.perf_counter() - t0) * 1000

    print(f"Inspection ID:     {inspection_id}")
    print(f"Pipeline Status:   {res.status.upper()}")
    print(f"Processing Time:   {elapsed_ms:.1f} ms")
    print(f"Calibration:       {res.calibration.get('status', 'UNAVAILABLE')} (Ref Detected: {res.calibration.get('reference_detected', False)})")
    print(f"Detected Onions:   {res.total_onions}")
    print(f"Batch Quality:     {res.quality_score:.1f} / 100")
    print(f"Defect Rate:       {res.defect_rate:.1f}%")

    if res.average_size_mm is not None:
        print(f"Average Diameter:  {res.average_size_mm:.1f} mm")
    else:
        print(f"Average Diameter:  Uncalibrated (requires planar reference disc)")

    print(f"Grade Breakdown:   A={res.grade_distribution.get('A', 0)}, B={res.grade_distribution.get('B', 0)}, C={res.grade_distribution.get('C', 0)}, Reject={res.grade_distribution.get('Reject', 0)}")

    if res.onions:
        print("\nIndividual Detected Bulbs:")
        for o in res.onions:
            sz_str = f"{o.size_mm:.1f} mm" if o.size_mm else f"{o.size_pixels:.0f} px"
            print(f"  • #{o.onion_number:02d} [{o.variety}]: {o.quality_class} (Conf: {o.quality_confidence:.1%}) | Grade: {o.grade} | Size: {sz_str} | Review: {o.review_status}")


def main():
    parser = argparse.ArgumentParser(description="ONIONVISION Real CV Pipeline Demo Runner")
    parser.add_argument("--image", type=str, default=None, help="Path to specific image file")
    parser.add_argument("--ref-mm", type=float, default=25.0, help="Known reference disc diameter in mm (default: 25.0)")
    args = parser.parse_args()

    init_db()

    print("=" * 65)
    print("ONIONVISION — REAL COMPUTER VISION PIPELINE DEMO RUNNER")
    print("=" * 65)

    if args.image:
        target = Path(args.image)
        run_single_image(target, reference_diameter_mm=args.ref_mm)
    else:
        demo_dir = WORKSPACE_ROOT / "data" / "demo"
        if not demo_dir.exists():
            print("[ERROR] Demo directory data/demo/ does not exist. Run scripts/prepare_demo_pack.py first.")
            return

        demo_images = sorted(list(demo_dir.rglob("*.jpg")) + list(demo_dir.rglob("*.png")))
        if not demo_images:
            print("[ERROR] No demo images found in data/demo/.")
            return

        print(f"Found {len(demo_images)} demo pack images. Executing pipeline...\n")
        # Run representative subset (first 3 across categories)
        for img in demo_images[:4]:
            run_single_image(img, reference_diameter_mm=args.ref_mm)

    print("\n" + "=" * 65)
    print("DEMO EXECUTION FINISHED SUCCESSFULLY")
    print("=" * 65)


if __name__ == "__main__":
    main()
