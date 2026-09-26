#!/usr/bin/env python3
"""
ONIONVISION — Quality Classification Training Script (MobileNetV3-Small)
Trains binary health classifier on real onion bulb dataset (Healthy vs Unhealthy).
Addresses class imbalance via loss weighting and evaluates on held-out test split.
"""

import json
import time
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED_DIR = WORKSPACE_ROOT / "data" / "processed" / "classification"
MODELS_DIR = WORKSPACE_ROOT / "ml" / "models"
EVAL_DIR = WORKSPACE_ROOT / "ml" / "evaluation" / "classification"

MODELS_DIR.mkdir(parents=True, exist_ok=True)
EVAL_DIR.mkdir(parents=True, exist_ok=True)


def get_transforms():
    """Returns training and validation image transforms."""
    normalize = transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    )
    train_transform = transforms.Compose([
        transforms.Resize((240, 240)),
        transforms.RandomResizedCrop(224, scale=(0.85, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        normalize,
    ])
    eval_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        normalize,
    ])
    return train_transform, eval_transform


def train_classification(epochs: int = 10, batch_size: int = 64, lr: float = 1e-3):
    print("=" * 60)
    print("STARTING ONION HEALTH CLASSIFICATION TRAINING (MobileNetV3-Small)")
    print("=" * 60)

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'})")

    train_transform, eval_transform = get_transforms()

    train_dataset = datasets.ImageFolder(str(PROCESSED_DIR / "train"), transform=train_transform)
    val_dataset = datasets.ImageFolder(str(PROCESSED_DIR / "val"), transform=eval_transform)
    test_dataset = datasets.ImageFolder(str(PROCESSED_DIR / "test"), transform=eval_transform)

    print(f"Classes: {train_dataset.classes} (Mapping: {train_dataset.class_to_idx})")
    print(f"Dataset sizes — Train: {len(train_dataset)}, Val: {len(val_dataset)}, Test: {len(test_dataset)}")

    # Calculate class weights for loss function to address class imbalance
    class_counts = [0] * len(train_dataset.classes)
    for _, label in train_dataset.samples:
        class_counts[label] += 1

    total_samples = len(train_dataset)
    class_weights = [total_samples / (len(train_dataset.classes) * count) for count in class_counts]
    class_weights_tensor = torch.tensor(class_weights, dtype=torch.float).to(device)
    print(f"Class distribution: Healthy={class_counts[0]}, Unhealthy={class_counts[1]}")
    print(f"Class weights applied to loss: {class_weights}")

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=2, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=2, pin_memory=True)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=2, pin_memory=True)

    # Initialize MobileNetV3-Small
    model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(in_features, len(train_dataset.classes))
    model = model.to(device)

    criterion = nn.CrossEntropyLoss(weight=class_weights_tensor)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_val_loss = float("inf")
    best_weights_path = MODELS_DIR / "onion_health_mobilenetv3_small.pth"
    start_time = time.time()

    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            total += targets.size(0)
            correct += predicted.eq(targets).sum().item()

        train_loss = running_loss / total
        train_acc = correct / total

        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)

                val_loss += loss.item() * inputs.size(0)
                _, predicted = outputs.max(1)
                val_total += targets.size(0)
                val_correct += predicted.eq(targets).sum().item()

        val_loss = val_loss / val_total
        val_acc = val_correct / val_total
        scheduler.step()

        print(f"Epoch [{epoch+1:02d}/{epochs:02d}] Train Loss: {train_loss:.4f} Acc: {train_acc*100:.2f}% | Val Loss: {val_loss:.4f} Acc: {val_acc*100:.2f}%")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save({
                "epoch": epoch + 1,
                "model_state_dict": model.state_dict(),
                "classes": train_dataset.classes,
                "class_to_idx": train_dataset.class_to_idx,
                "val_loss": val_loss,
                "val_acc": val_acc,
            }, best_weights_path)

    training_time = time.time() - start_time
    print(f"\nTraining completed in {training_time / 60:.2f} minutes.")
    print(f"Best checkpoint saved to: {best_weights_path}")

    # Evaluate on held-out test split
    print("\nEvaluating on held-out TEST split (1,840 images)...")
    checkpoint = torch.load(best_weights_path, map_location=device, weights_only=True)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    all_targets = []
    all_preds = []
    all_confs = []

    inference_times = []
    with torch.no_grad():
        for inputs, targets in test_loader:
            inputs = inputs.to(device)
            t0 = time.time()
            outputs = model(inputs)
            inference_times.append((time.time() - t0) / inputs.size(0))

            probs = torch.softmax(outputs, dim=1)
            confs, predicted = probs.max(1)

            all_targets.extend(targets.cpu().numpy().tolist())
            all_preds.extend(predicted.cpu().numpy().tolist())
            all_confs.extend(confs.cpu().numpy().tolist())

    y_true = np.array(all_targets)
    y_pred = np.array(all_preds)

    # Compute Confusion Matrix
    # 0: Healthy, 1: Unhealthy
    tp = int(np.sum((y_true == 1) & (y_pred == 1)))  # True Unhealthy
    tn = int(np.sum((y_true == 0) & (y_pred == 0)))  # True Healthy
    fp = int(np.sum((y_true == 0) & (y_pred == 1)))  # False Unhealthy
    fn = int(np.sum((y_true == 1) & (y_pred == 0)))  # False Healthy (Missed defect)

    accuracy = float((tp + tn) / len(y_true))
    precision_unhealthy = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall_unhealthy = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    f1_unhealthy = (
        float(2 * precision_unhealthy * recall_unhealthy / (precision_unhealthy + recall_unhealthy))
        if (precision_unhealthy + recall_unhealthy) > 0
        else 0.0
    )

    avg_speed_ms = float(np.mean(inference_times) * 1000)

    test_metrics = {
        "model_name": "onion_health_mobilenetv3_small.pth",
        "architecture": "MobileNetV3-Small",
        "task": "Binary Bulb Health Classification (Healthy vs Unhealthy)",
        "epochs_trained": epochs,
        "batch_size": batch_size,
        "classes": train_dataset.classes,
        "test_samples_total": len(y_true),
        "metrics": {
            "overall_accuracy": round(accuracy, 4),
            "unhealthy_precision": round(precision_unhealthy, 4),
            "unhealthy_recall": round(recall_unhealthy, 4),
            "unhealthy_f1": round(f1_unhealthy, 4),
        },
        "confusion_matrix": {
            "true_healthy_pred_healthy": tn,
            "true_healthy_pred_unhealthy": fp,
            "true_unhealthy_pred_healthy": fn,
            "true_unhealthy_pred_unhealthy": tp,
        },
        "mean_inference_latency_ms": round(avg_speed_ms, 2),
    }

    metrics_path = EVAL_DIR / "classification_test_metrics.json"
    metrics_path.write_text(json.dumps(test_metrics, indent=2), encoding="utf-8")
    print(f"Classification test metrics saved to: {metrics_path}")
    print(f"Accuracy: {accuracy*100:.2f}% | Unhealthy Recall: {recall_unhealthy*100:.2f}% | Unhealthy F1: {f1_unhealthy:.4f}")

    return test_metrics


if __name__ == "__main__":
    train_classification()
