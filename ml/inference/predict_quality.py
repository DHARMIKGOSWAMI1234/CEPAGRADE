#!/usr/bin/env python3
"""
ONIONVISION — Real Inference Module: Quality Classification
Loads trained MobileNetV3-Small model and produces real binary health predictions
(Healthy vs Unhealthy) on cropped individual onion instances.
"""

from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from PIL import Image
import torch
import torch.nn as nn
from torchvision import models, transforms


class OnionQualityPredictor:
    """Wrapper for real MobileNetV3-Small inference on individual onion crops."""

    def __init__(self, model_path: Optional[Path] = None, device: Optional[str] = None):
        self.model_path = model_path or Path(__file__).resolve().parent.parent / "models" / "onion_health_mobilenetv3_small.pth"
        self.device = torch.device(device or ("cuda:0" if torch.cuda.is_available() else "cpu"))
        self._model = None
        self.classes = ["Healthy", "Unhealthy"]

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

    def is_ready(self) -> bool:
        """Returns True if weights file exists."""
        return self.model_path.exists()

    def load_model(self):
        """Loads MobileNetV3 weights from checkpoint."""
        if not self.is_ready():
            raise FileNotFoundError(f"Classification model weights not found at: {self.model_path}")

        if self._model is None:
            checkpoint = torch.load(self.model_path, map_location=self.device, weights_only=True)
            self.classes = checkpoint.get("classes", ["Healthy", "Unhealthy"])

            model = models.mobilenet_v3_small(weights=None)
            in_features = model.classifier[3].in_features
            model.classifier[3] = nn.Linear(in_features, len(self.classes))
            model.load_state_dict(checkpoint["model_state_dict"])
            model.to(self.device)
            model.eval()
            self._model = model

    def predict_crop(self, crop_image: Image.Image) -> Dict[str, Any]:
        """
        Runs health classification on a PIL Image crop.
        Returns predicted quality_class and confidence probability.
        """
        self.load_model()
        if crop_image.mode != "RGB":
            crop_image = crop_image.convert("RGB")

        tensor = self.transform(crop_image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            output = self._model(tensor)
            probs = torch.softmax(output, dim=1)[0]
            conf, pred_idx = probs.max(0)

        quality_class = self.classes[int(pred_idx.item())]
        confidence = float(conf.item())

        return {
            "quality_class": quality_class,
            "confidence": round(confidence, 4),
            "is_healthy": quality_class == "Healthy",
            "probabilities": {
                self.classes[i]: round(float(probs[i].item()), 4)
                for i in range(len(self.classes))
            },
        }
