#!/usr/bin/env python3
"""
ONIONVISION — Segmentation Model Training Script (YOLOv8n-seg)
Trains YOLOv8n-seg on real onion instance segmentation dataset.
Classes: Red-Onion (0), Reference-Object (1), Yellow-Onion (2)
"""

import json
import shutil
import time
from pathlib import Path
import torch
from ultralytics import YOLO

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
DATASET_YAML = WORKSPACE_ROOT / "data" / "processed" / "segmentation" / "dataset.yaml"
MODELS_DIR = WORKSPACE_ROOT / "ml" / "models"
EVAL_DIR = WORKSPACE_ROOT / "ml" / "evaluation" / "segmentation"

MODELS_DIR.mkdir(parents=True, exist_ok=True)
EVAL_DIR.mkdir(parents=True, exist_ok=True)


def train_segmentation(epochs: int = 15, batch_size: int = 16, imgsz: int = 640):
    print("=" * 60)
    print("STARTING ONION INSTANCE SEGMENTATION TRAINING (YOLOv8n-seg)")
    print("=" * 60)

    device = "0" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'})")
    print(f"Dataset config: {DATASET_YAML}")

    # Initialize YOLOv8n-seg
    model = YOLO("yolov8n-seg.pt")

    start_time = time.time()
    results = model.train(
        data=str(DATASET_YAML),
        epochs=epochs,
        batch=batch_size,
        imgsz=imgsz,
        device=device,
        project=str(WORKSPACE_ROOT / "ml" / "runs" / "segmentation"),
        name="onion_seg_run",
        exist_ok=True,
        workers=2,
        seed=42,
        patience=8,
        save=True,
        plots=True,
        verbose=True,
    )
    training_duration = time.time() - start_time
    print(f"\nTraining completed in {training_duration / 60:.2f} minutes.")

    # Locate best trained weights
    best_weights = WORKSPACE_ROOT / "ml" / "runs" / "segmentation" / "onion_seg_run" / "weights" / "best.pt"
    target_weights = MODELS_DIR / "onion_segmentation_yolov8n.pt"

    if best_weights.exists():
        shutil.copy2(best_weights, target_weights)
        print(f"Saved primary model artifact to: {target_weights}")
    else:
        raise FileNotFoundError(f"Trained weights not found at {best_weights}")

    # Evaluate on held-out test split
    print("\nEvaluating on held-out TEST set...")
    val_model = YOLO(str(target_weights))
    test_metrics = val_model.val(
        data=str(DATASET_YAML),
        split="test",
        imgsz=imgsz,
        batch=batch_size,
        device=device,
        plots=True,
    )

    # Extract test performance metrics
    metrics_summary = {
        "model_name": "onion_segmentation_yolov8n.pt",
        "architecture": "YOLOv8n-seg",
        "task": "Instance Segmentation & Scale Reference Localization",
        "epochs_trained": epochs,
        "batch_size": batch_size,
        "image_size": imgsz,
        "training_duration_seconds": round(training_duration, 1),
        "device": device,
        "classes": ["Red-Onion", "Reference-Object", "Yellow-Onion"],
        "box_metrics": {
            "mAP50": round(float(test_metrics.box.map50), 4),
            "mAP50_95": round(float(test_metrics.box.map), 4),
            "precision": round(float(test_metrics.box.mp), 4),
            "recall": round(float(test_metrics.box.mr), 4),
        },
        "mask_metrics": {
            "mAP50": round(float(test_metrics.seg.map50), 4),
            "mAP50_95": round(float(test_metrics.seg.map), 4),
            "precision": round(float(test_metrics.seg.mp), 4),
            "recall": round(float(test_metrics.seg.mr), 4),
        },
        "inference_speed_ms": {
            "preprocess": round(float(test_metrics.speed.get("preprocess", 0)), 2),
            "inference": round(float(test_metrics.speed.get("inference", 0)), 2),
            "postprocess": round(float(test_metrics.speed.get("postprocess", 0)), 2),
        }
    }

    metrics_file = EVAL_DIR / "segmentation_test_metrics.json"
    metrics_file.write_text(json.dumps(metrics_summary, indent=2), encoding="utf-8")
    print(f"Test metrics saved to: {metrics_file}")
    print(f"Mask mAP50: {metrics_summary['mask_metrics']['mAP50']:.4f} | Box mAP50: {metrics_summary['box_metrics']['mAP50']:.4f}")

    return metrics_summary


if __name__ == "__main__":
    train_segmentation()
