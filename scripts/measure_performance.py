"""
ONIONVISION — Performance and Latency Measurement Suite (Phase 06)
Measures:
1. Model loading time
2. First inference (cold start)
3. Subsequent inferences (warm execution)
4. Pipeline throughput (FPS)
"""

from pathlib import Path
import time
import sys
import numpy as np

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT / "backend"))

from app.cv.pipeline import RealCVPipeline
from app.ml.segmentation import SegmentationEngine
from app.ml.quality import QualityEngine


def main():
    print("=" * 65)
    print("ONIONVISION — PERFORMANCE & LATENCY MEASUREMENT")
    print("=" * 65)
    print("Environment: Measured on local development workstation (Windows x64)")
    print("-" * 65)

    # 1. Model Loading Benchmark
    t0 = time.perf_counter()
    seg_engine = SegmentationEngine.load_trained()
    t_seg_load = (time.perf_counter() - t0) * 1000

    t0 = time.perf_counter()
    qual_engine = QualityEngine.load_trained()
    t_qual_load = (time.perf_counter() - t0) * 1000

    print(f"Model Loading Times:")
    print(f"  • YOLOv8n-seg Weights:       {t_seg_load:.2f} ms")
    print(f"  • MobileNetV3-Small Weights:  {t_qual_load:.2f} ms")
    print(f"  • Total Weights Load:        {t_seg_load + t_qual_load:.2f} ms")
    print("-" * 65)

    pipeline = RealCVPipeline(seg_engine=seg_engine, qual_engine=qual_engine)

    demo_images = [
        WORKSPACE_ROOT / "data" / "demo" / "01_single_onion" / "demo_single_onion.jpg",
        WORKSPACE_ROOT / "data" / "demo" / "02_multiple_onions" / "demo_multiple_onions.jpg",
        WORKSPACE_ROOT / "data" / "demo" / "03_reference_calibration" / "demo_reference_coin_calibration.jpg",
        WORKSPACE_ROOT / "data" / "demo" / "06_difficult_cluster" / "demo_touching_cluster.jpg",
    ]

    existing_images = [img for img in demo_images if img.exists()]
    if not existing_images:
        print("[ERROR] No demo images found. Run scripts/prepare_demo_pack.py first.")
        return

    # 2. First Inference (Cold Start)
    cold_img = existing_images[0]
    t0 = time.perf_counter()
    res_cold = pipeline.process(cold_img, known_reference_diameter_mm=25.0)
    t_cold = (time.perf_counter() - t0) * 1000

    print(f"First Inference (Cold Start):")
    print(f"  • Target:                    {cold_img.name}")
    print(f"  • Total Execution:           {t_cold:.2f} ms")
    print(f"  • Onions Detected:           {res_cold.total_onions}")
    print("-" * 65)

    # 3. Subsequent Inferences (Warm Execution)
    warm_latencies = []
    print("Subsequent Inferences (Warm Pipeline):")
    for i, img in enumerate(existing_images * 2, start=1):
        t0 = time.perf_counter()
        res_warm = pipeline.process(img, known_reference_diameter_mm=25.0)
        dur = (time.perf_counter() - t0) * 1000
        warm_latencies.append(dur)
        print(f"  [Run {i:02d}] {img.name:<32} -> {dur:.2f} ms ({res_warm.total_onions} onions)")

    mean_lat = float(np.mean(warm_latencies))
    median_lat = float(np.median(warm_latencies))
    min_lat = float(np.min(warm_latencies))
    max_lat = float(np.max(warm_latencies))
    fps = 1000.0 / mean_lat if mean_lat > 0 else 0

    print("-" * 65)
    print("Benchmark Summary:")
    print(f"  • Mean Warm Latency:         {mean_lat:.2f} ms")
    print(f"  • Median Warm Latency:       {median_lat:.2f} ms")
    print(f"  • Min / Max Latency:         {min_lat:.2f} ms / {max_lat:.2f} ms")
    print(f"  • Throughput:                {fps:.1f} frames/sec (FPS)")
    print("=" * 65)


if __name__ == "__main__":
    main()
