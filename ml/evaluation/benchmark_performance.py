#!/usr/bin/env python3
"""
ONIONVISION — Real Performance Benchmarking Script
Measures actual latency for:
1. Model loading time
2. Segmentation inference time (YOLOv8n-seg, 640x640)
3. Quality classification inference time (MobileNetV3-Small, 224x224)
4. Full end-to-end pipeline execution time
Records hardware details and outputs real, verified timing numbers.
"""

import json
from pathlib import Path
import sys
import time
import numpy as np
from PIL import Image
import torch

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from ml.inference.predict_segmentation import OnionSegmentationPredictor
from ml.inference.predict_quality import OnionQualityPredictor
from ml.inference.pipeline import FullInferencePipeline

PROCESSED_SEG = WORKSPACE_ROOT / "data" / "processed" / "segmentation"
PROCESSED_CLS = WORKSPACE_ROOT / "data" / "processed" / "classification"
EVAL_DIR = WORKSPACE_ROOT / "ml" / "evaluation"


def benchmark():
    device_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    cuda_available = torch.cuda.is_available()
    vram_mb = torch.cuda.get_device_properties(0).total_memory / (1024 * 1024) if cuda_available else 0

    print("=" * 60)
    print("RUNNING ONIONVISION PERFORMANCE BENCHMARK")
    print(f"Hardware: {device_name} (CUDA: {cuda_available}, VRAM: {vram_mb:.0f} MB)")
    print("=" * 60)

    # 1. Model Loading Time
    t0 = time.perf_counter()
    seg_predictor = OnionSegmentationPredictor()
    seg_predictor.load_model()
    seg_load_time_ms = round((time.perf_counter() - t0) * 1000, 2)
    print(f"Segmentation Model Load Time:   {seg_load_time_ms:.2f} ms")

    t0 = time.perf_counter()
    cls_predictor = OnionQualityPredictor()
    cls_predictor.load_model()
    cls_load_time_ms = round((time.perf_counter() - t0) * 1000, 2)
    print(f"Classification Model Load Time:  {cls_load_time_ms:.2f} ms")

    # Pick real test images
    test_seg_images = sorted(list((PROCESSED_SEG / "images" / "test").glob("*.jpg")))[:20]
    test_cls_images = sorted(list((PROCESSED_CLS / "test" / "Healthy").glob("*.jpg")))[:20]

    # Warmup
    if test_seg_images:
        seg_predictor.predict(str(test_seg_images[0]))
    if test_cls_images:
        with Image.open(test_cls_images[0]) as img:
            cls_predictor.predict_crop(img)

    # 2. Segmentation Inference Latency
    seg_latencies = []
    for img_p in test_seg_images:
        t_start = time.perf_counter()
        _ = seg_predictor.predict(str(img_p))
        seg_latencies.append((time.perf_counter() - t_start) * 1000)

    avg_seg_latency_ms = round(float(np.mean(seg_latencies)), 2)
    p95_seg_latency_ms = round(float(np.percentile(seg_latencies, 95)), 2)
    print(f"Segmentation Latency (Mean):     {avg_seg_latency_ms:.2f} ms (p95: {p95_seg_latency_ms:.2f} ms)")

    # 3. Classification Inference Latency
    cls_latencies = []
    for img_p in test_cls_images:
        with Image.open(img_p) as img:
            t_start = time.perf_counter()
            _ = cls_predictor.predict_crop(img)
            cls_latencies.append((time.perf_counter() - t_start) * 1000)

    avg_cls_latency_ms = round(float(np.mean(cls_latencies)), 2)
    p95_cls_latency_ms = round(float(np.percentile(cls_latencies, 95)), 2)
    print(f"Classification Latency (Mean):   {avg_cls_latency_ms:.2f} ms (p95: {p95_cls_latency_ms:.2f} ms)")

    # 4. End-to-End Pipeline Latency
    pipeline = FullInferencePipeline(seg_predictor=seg_predictor, qual_predictor=cls_predictor)
    pipeline_latencies = []
    for img_p in test_seg_images[:10]:
        t_start = time.perf_counter()
        _ = pipeline.process(img_p)
        pipeline_latencies.append((time.perf_counter() - t_start) * 1000)

    avg_pipeline_latency_ms = round(float(np.mean(pipeline_latencies)), 2)
    p95_pipeline_latency_ms = round(float(np.percentile(pipeline_latencies, 95)), 2)
    print(f"End-to-End Pipeline Latency:     {avg_pipeline_latency_ms:.2f} ms (p95: {p95_pipeline_latency_ms:.2f} ms)")

    benchmark_data = {
        "hardware": {
            "device": device_name,
            "cuda_available": cuda_available,
            "vram_total_mb": round(vram_mb, 1),
            "python_version": sys.version.split()[0],
            "torch_version": torch.__version__,
        },
        "model_loading_ms": {
            "segmentation_yolov8n": seg_load_time_ms,
            "classification_mobilenetv3": cls_load_time_ms,
            "total_initialization": round(seg_load_time_ms + cls_load_time_ms, 2),
        },
        "inference_latency_ms": {
            "segmentation_640x640": {
                "mean_ms": avg_seg_latency_ms,
                "p95_ms": p95_seg_latency_ms,
                "fps_equivalent": round(1000.0 / avg_seg_latency_ms, 1) if avg_seg_latency_ms > 0 else 0,
            },
            "classification_per_crop_224x224": {
                "mean_ms": avg_cls_latency_ms,
                "p95_ms": p95_cls_latency_ms,
                "fps_equivalent": round(1000.0 / avg_cls_latency_ms, 1) if avg_cls_latency_ms > 0 else 0,
            },
            "end_to_end_pipeline_per_image": {
                "mean_ms": avg_pipeline_latency_ms,
                "p95_ms": p95_pipeline_latency_ms,
                "fps_equivalent": round(1000.0 / avg_pipeline_latency_ms, 1) if avg_pipeline_latency_ms > 0 else 0,
            },
        },
    }

    out_file = EVAL_DIR / "benchmark_summary.json"
    out_file.write_text(json.dumps(benchmark_data, indent=2), encoding="utf-8")
    print(f"\nBenchmark summary saved to: {out_file}")
    return benchmark_data


if __name__ == "__main__":
    benchmark()
