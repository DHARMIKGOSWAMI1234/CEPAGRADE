#!/usr/bin/env python3
"""
ONIONVISION — Phase 04 End-to-End Pipeline Performance Benchmarking
Runs 25 warm iterations across real test images to accurately measure:
1. Segmentation latency (YOLOv8n-seg)
2. Extraction latency (Bounding box crop & precision masked crop)
3. Morphometry latency (Contour, axes, aspect ratio, circularity, equivalent diameter)
4. Classification latency (MobileNetV3-Small)
5. Grading latency (Deterministic explainable rule engine)
6. Database persistence latency (SQLAlchemy commit & rollback)
7. Full End-to-End Pipeline latency
Reports: mean, median, p95 for each stage.
"""

import json
from pathlib import Path
import sys
import time
import numpy as np
import torch
from PIL import Image

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = WORKSPACE_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from app.cv.pipeline import RealCVPipeline
from app.cv.extractor import OnionExtractor
from app.cv.morphometry import calculate_morphometry
from app.services.grading_service import grading_service
from app.db.database import SessionLocal
from app.db.models import Inspection, OnionResult

SEG_TEST_DIR = WORKSPACE_ROOT / "data" / "processed" / "segmentation" / "images" / "test"
OUT_DIR = WORKSPACE_ROOT / "ml" / "evaluation" / "phase04"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def benchmark_pipeline(num_iterations: int = 25):
    print("=" * 60)
    print("RUNNING ONIONVISION PHASE 04 PIPELINE BENCHMARK")
    print(f"Iterations: {num_iterations} (Real Audited Test Images)")
    device_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    print(f"Hardware: {device_name}")
    print("=" * 60)

    pipeline = RealCVPipeline()
    test_images = sorted(list(SEG_TEST_DIR.glob("*.jpg")))[:10]
    assert test_images, "No test images found"

    # Warm-up (3 iterations)
    print("Warming up models and GPU caches...")
    for _ in range(3):
        pipeline.process(test_images[0], known_reference_diameter_mm=25.0)

    seg_times = []
    extract_times = []
    morph_times = []
    qual_times = []
    grade_times = []
    db_times = []
    total_times = []

    db = SessionLocal()

    print(f"Executing {num_iterations} benchmark runs...")
    for i in range(num_iterations):
        img_path = test_images[i % len(test_images)]
        t_start = time.perf_counter()

        # Run pipeline
        res = pipeline.process(img_path, known_reference_diameter_mm=25.0)
        t_pipeline = (time.perf_counter() - t_start) * 1000

        # Stage timings from pipeline breakdown
        seg_times.append(res.timing_breakdown.get("segmentation", 0.0))
        extract_times.append(res.timing_breakdown.get("extraction", 0.0))
        morph_times.append(res.timing_breakdown.get("morphometry", 0.0))
        qual_times.append(res.timing_breakdown.get("quality_classification", 0.0))
        grade_times.append(res.timing_breakdown.get("grading", 0.0))

        # Measure Database Persistence latency
        t_db_start = time.perf_counter()
        test_ins_id = f"BENCH-{i:03d}"
        rec = Inspection(
            inspection_id=test_ins_id,
            image_path=str(img_path),
            status=res.status,
            total_onions=res.total_onions,
            average_size_mm=res.average_size_mm,
            quality_score=res.quality_score,
            defect_rate=res.defect_rate,
        )
        db.add(rec)
        for onion in res.onions:
            db.add(OnionResult(
                inspection_id=test_ins_id,
                onion_number=onion.onion_number,
                size_mm=onion.size_mm,
                quality_class=onion.quality_class,
                grade=onion.grade,
                confidence=onion.quality_confidence,
                defect_area=15.0 if onion.quality_class == "Unhealthy" else 0.0,
            ))
        db.commit()
        # Clean up benchmark row
        db.query(OnionResult).filter_by(inspection_id=test_ins_id).delete()
        db.query(Inspection).filter_by(inspection_id=test_ins_id).delete()
        db.commit()
        t_db = (time.perf_counter() - t_db_start) * 1000
        db_times.append(t_db)

        total_times.append(t_pipeline + t_db)

    db.close()

    def stats(arr):
        return {
            "mean_ms": round(float(np.mean(arr)), 2),
            "median_ms": round(float(np.median(arr)), 2),
            "p95_ms": round(float(np.percentile(arr, 95)), 2),
        }

    benchmark_results = {
        "hardware": {
            "device": device_name,
            "cuda_available": torch.cuda.is_available(),
            "python_version": sys.version.split()[0],
            "torch_version": torch.__version__,
        },
        "iterations": num_iterations,
        "stages": {
            "1_segmentation_yolov8n": stats(seg_times),
            "2_extraction_masked_crops": stats(extract_times),
            "3_morphometry_geometry": stats(morph_times),
            "4_classification_mobilenetv3": stats(qual_times),
            "5_grading_rule_engine": stats(grade_times),
            "6_database_persistence": stats(db_times),
            "7_full_end_to_end_pipeline": stats(total_times),
        },
        "summary": {
            "mean_total_pipeline_ms": stats(total_times)["mean_ms"],
            "fps_throughput": round(1000.0 / stats(total_times)["mean_ms"], 1),
            "phase03_comparison": {
                "phase03_pipeline_latency_ms": 49.64,
                "phase04_pipeline_latency_ms": stats(total_times)["mean_ms"],
                "variance_explanation": "Phase 04 adds precision masked crop extraction, full morphometry (perimeter, axes, circularity, equivalent diameter), and database persistence.",
            },
        },
    }

    out_file = OUT_DIR / "benchmark_summary.json"
    out_file.write_text(json.dumps(benchmark_results, indent=2), encoding="utf-8")

    print("\nBENCHMARK RESULTS (25 Iterations):")
    print(f"  Segmentation (YOLOv8n-seg):   {benchmark_results['stages']['1_segmentation_yolov8n']['mean_ms']} ms (median: {benchmark_results['stages']['1_segmentation_yolov8n']['median_ms']} ms, p95: {benchmark_results['stages']['1_segmentation_yolov8n']['p95_ms']} ms)")
    print(f"  Masked Crop Extraction:       {benchmark_results['stages']['2_extraction_masked_crops']['mean_ms']} ms")
    print(f"  Morphometry & Geometry:       {benchmark_results['stages']['3_morphometry_geometry']['mean_ms']} ms")
    print(f"  Classification (MobileNetV3): {benchmark_results['stages']['4_classification_mobilenetv3']['mean_ms']} ms")
    print(f"  Grading Rule Engine:          {benchmark_results['stages']['5_grading_rule_engine']['mean_ms']} ms")
    print(f"  Database Persistence:         {benchmark_results['stages']['6_database_persistence']['mean_ms']} ms")
    print(f"  Total End-to-End Pipeline:    {benchmark_results['stages']['7_full_end_to_end_pipeline']['mean_ms']} ms (Throughput: {benchmark_results['summary']['fps_throughput']} FPS)")
    print(f"\nSaved benchmark results to: {out_file}")


if __name__ == "__main__":
    benchmark_pipeline()
