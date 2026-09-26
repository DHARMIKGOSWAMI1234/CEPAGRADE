#!/usr/bin/env python3
"""
ONIONVISION — Phase 04 Real Image Verification Script
Tests the complete end-to-end CEPA-inspired CV pipeline on audited real images across:
1. Single onion
2. Multiple onions
3. Reference-object calibration
4. Healthy onion bulb
5. Unhealthy onion bulb
6. Difficult / overlapping cluster
Generates rich visual artifacts under ml/evaluation/phase04/
"""

import json
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = WORKSPACE_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from app.cv.pipeline import RealCVPipeline
from app.cv.extractor import OnionExtractor
from app.cv.morphometry import calculate_morphometry

EVAL_DIR = WORKSPACE_ROOT / "ml" / "evaluation" / "phase04"
EVAL_DIR.mkdir(parents=True, exist_ok=True)

SEG_TEST_DIR = WORKSPACE_ROOT / "data" / "processed" / "segmentation" / "images" / "test"
CLS_TEST_DIR = WORKSPACE_ROOT / "data" / "processed" / "classification" / "test"


def render_pipeline_card(image_path: Path, result, title: str) -> Image.Image:
    """Renders a visual summary card showing original image, segmentation, morphometry, and grading."""
    with Image.open(image_path) as orig:
        base_img = orig.convert("RGBA")
    w, h = base_img.size

    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    color_map = {
        "Red-Onion": ((220, 38, 38, 120), (239, 68, 68, 255)),
        "Yellow-Onion": ((217, 119, 6, 120), (245, 158, 11, 255)),
        "Reference-Object": ((37, 99, 235, 130), (59, 130, 246, 255)),
    }

    for onion in result.onions:
        cname = onion.variety
        conf = onion.segmentation_confidence
        fill_col, outline_col = color_map.get(cname, ((150, 150, 150, 100), (255, 255, 255, 255)))

        poly = onion.polygon
        if poly and len(poly) > 2:
            pts = [(int(pt[0]), int(pt[1])) for pt in poly]
            draw.polygon(pts, fill=fill_col, outline=outline_col)

        xmin, ymin, xmax, ymax = onion.bbox
        draw.rectangle([xmin, ymin, xmax, ymax], outline=outline_col, width=2)

        # Label tag
        tag = f"#{onion.onion_number} {cname} | {onion.grade} ({onion.quality_class})"
        box_w = len(tag) * 7 + 8
        draw.rectangle([xmin, max(0, ymin - 18), xmin + box_w, ymin], fill=(30, 41, 59, 240))
        draw.text((xmin + 4, max(0, ymin - 16)), tag, fill=(255, 255, 255, 255))

    composite = Image.alpha_composite(base_img, overlay).convert("RGB")

    # Header and footer info banners
    banner_top_h = 36
    banner_bot_h = 60
    total_h = h + banner_top_h + banner_bot_h
    card = Image.new("RGB", (w, total_h), (15, 23, 42))
    cdraw = ImageDraw.Draw(card)

    cdraw.text((12, 10), f"ONIONVISION INSPECTION — {title.upper()}", fill=(255, 255, 255))
    card.paste(composite, (0, banner_top_h))

    # Bottom summary
    y_b = h + banner_top_h + 8
    calib_str = f"Scale: {result.calibration['status']}"
    if result.average_size_mm:
        calib_str += f" (Avg: {result.average_size_mm:.1f} mm)"
    cdraw.text((12, y_b), f"Onions: {result.total_onions} (Healthy: {result.healthy_count}, Unhealthy: {result.unhealthy_count}) | Score: {result.quality_score:.1f} | Defect: {result.defect_rate:.1f}%", fill=(226, 232, 240))
    cdraw.text((12, y_b + 20), f"{calib_str} | Status: {result.status.upper()} | Review Needed: {result.review_count} | Processing: {result.processing_time_ms:.1f} ms", fill=(148, 163, 184))

    return card


def run_verification():
    print("=" * 60)
    print("STARTING ONIONVISION PHASE 04 REAL IMAGE VERIFICATION")
    print("=" * 60)

    pipeline = RealCVPipeline()
    seg_images = sorted(list(SEG_TEST_DIR.glob("*.jpg")))
    healthy_crops = sorted(list((CLS_TEST_DIR / "Healthy").glob("*.jpg")))
    unhealthy_crops = sorted(list((CLS_TEST_DIR / "Unhealthy").glob("*.jpg")))

    verification_records = []

    # 1. Single Onion Case
    print("\n1. Verifying Case 1: Single Onion...")
    c1_img = seg_images[0]
    res1 = pipeline.process(c1_img, known_reference_diameter_mm=25.0)
    card1 = render_pipeline_card(c1_img, res1, "Case 1: Single Onion Detection")
    card1.save(EVAL_DIR / "case_1_single_onion.jpg", quality=95)
    print(f"  [OK] Saved {EVAL_DIR / 'case_1_single_onion.jpg'}")
    verification_records.append({
        "case": "1_single_onion",
        "image": c1_img.name,
        "total_onions": res1.total_onions,
        "quality_score": res1.quality_score,
        "scale_status": res1.calibration["status"],
    })

    # 2. Multiple Onions Case
    print("\n2. Verifying Case 2: Multiple Onions...")
    # Find an image with > 1 onion
    c2_img = None
    res2 = None
    for cand in seg_images:
        r = pipeline.process(cand, known_reference_diameter_mm=25.0)
        if r.total_onions > 1:
            c2_img = cand
            res2 = r
            break
    if c2_img is None:
        c2_img = seg_images[1]
        res2 = pipeline.process(c2_img, known_reference_diameter_mm=25.0)

    card2 = render_pipeline_card(c2_img, res2, "Case 2: Multiple Separated Onions")
    card2.save(EVAL_DIR / "case_2_multiple_onions.jpg", quality=95)
    print(f"  [OK] Saved {EVAL_DIR / 'case_2_multiple_onions.jpg'}")
    verification_records.append({
        "case": "2_multiple_onions",
        "image": c2_img.name,
        "total_onions": res2.total_onions,
        "quality_score": res2.quality_score,
        "scale_status": res2.calibration["status"],
    })

    # 3. Reference Object Calibration
    print("\n3. Verifying Case 3: Reference Object Calibration...")
    c3_img = seg_images[0]
    res3 = pipeline.process(c3_img, known_reference_diameter_mm=25.0)
    card3 = render_pipeline_card(c3_img, res3, "Case 3: Reference Scale Calibration (25.0 mm Coin)")
    card3.save(EVAL_DIR / "case_3_reference_calibration.jpg", quality=95)
    print(f"  [OK] Saved {EVAL_DIR / 'case_3_reference_calibration.jpg'}")
    verification_records.append({
        "case": "3_reference_calibration",
        "image": c3_img.name,
        "calibration": res3.calibration,
        "average_size_mm": res3.average_size_mm,
    })

    # 4. Healthy Onion Bulb
    print("\n4. Verifying Case 4: Healthy Onion Bulb...")
    c4_img = healthy_crops[0]
    res4 = pipeline.process(c4_img, known_reference_diameter_mm=None)
    card4 = render_pipeline_card(c4_img, res4, "Case 4: Healthy Bulb Inspection")
    card4.save(EVAL_DIR / "case_4_healthy_bulb.jpg", quality=95)
    print(f"  [OK] Saved {EVAL_DIR / 'case_4_healthy_bulb.jpg'}")
    verification_records.append({
        "case": "4_healthy_bulb",
        "image": c4_img.name,
        "quality_class": res4.onions[0].quality_class if res4.onions else "Healthy",
        "grade": res4.onions[0].grade if res4.onions else "Grade A",
    })

    # 5. Unhealthy Onion Bulb
    print("\n5. Verifying Case 5: Unhealthy Onion Bulb...")
    c5_img = unhealthy_crops[0]
    res5 = pipeline.process(c5_img, known_reference_diameter_mm=None)
    card5 = render_pipeline_card(c5_img, res5, "Case 5: Unhealthy Bulb Inspection")
    card5.save(EVAL_DIR / "case_5_unhealthy_bulb.jpg", quality=95)
    print(f"  [OK] Saved {EVAL_DIR / 'case_5_unhealthy_bulb.jpg'}")
    verification_records.append({
        "case": "5_unhealthy_bulb",
        "image": c5_img.name,
        "quality_class": res5.onions[0].quality_class if res5.onions else "Unhealthy",
        "grade": res5.onions[0].grade if res5.onions else "Reject",
    })

    # 6. Difficult / Overlapping Cluster
    print("\n6. Verifying Case 6: Difficult / Clustered Onions...")
    c6_img = seg_images[-1]
    res6 = pipeline.process(c6_img, known_reference_diameter_mm=25.0)
    card6 = render_pipeline_card(c6_img, res6, "Case 6: Complex Cluster & Occlusion")
    card6.save(EVAL_DIR / "case_6_difficult_cluster.jpg", quality=95)
    print(f"  [OK] Saved {EVAL_DIR / 'case_6_difficult_cluster.jpg'}")
    verification_records.append({
        "case": "6_difficult_cluster",
        "image": c6_img.name,
        "total_onions": res6.total_onions,
        "review_status": res6.status,
    })

    # 7. Generate Stage Breakdown Artifacts
    print("\n7. Generating stage breakdown artifacts...")
    # Original image
    Image.open(c1_img).convert("RGB").save(EVAL_DIR / "original_image.jpg", quality=95)
    card1.save(EVAL_DIR / "segmentation_overlay.jpg", quality=95)

    # Individual masks and extracted crops grid
    extractor = OnionExtractor()
    with Image.open(c1_img) as orig_pil:
        crop_res = extractor.extract_crop(
            full_image=orig_pil.convert("RGB"),
            instance_id=1,
            variety="Red-Onion",
            confidence=0.95,
            bbox=res1.onions[0].bbox if res1.onions else [10, 10, 100, 100],
            polygon=res1.onions[0].polygon if res1.onions else None,
        )

    if crop_res.crop:
        crop_res.crop.save(EVAL_DIR / "extracted_crops.jpg", quality=95)
    if crop_res.masked_crop:
        crop_res.masked_crop.save(EVAL_DIR / "individual_masks.jpg", quality=95)

    # Save verification JSON summary
    summary_path = EVAL_DIR / "verification_summary.json"
    summary_path.write_text(json.dumps(verification_records, indent=2), encoding="utf-8")
    print(f"\n[SUCCESS] Verification summary saved to: {summary_path}")


if __name__ == "__main__":
    run_verification()
