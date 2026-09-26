#!/usr/bin/env python3
"""
ONIONVISION — Segmentation Dataset Preprocessing Specification & Preparation Module
Target Dataset: Onion Segmentation (COCO format) — 4,849 images (640x640)

Audit Findings Addressed:
1. Category ID 0 is an unused artifact (0 annotations).
2. Existing 'valid' split has 0 Yellow-Onion annotations (severe class imbalance).
3. Every image contains exactly one 'Reference-Object' (ID 2).
4. Raw archives remain strictly read-only.
"""

import json
import random
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple
import zipfile


class SegmentationPreprocessor:
    """Handles parsing, validation, re-stratification, and export of segmentation annotations."""

    def __init__(self, raw_zip_path: Path, output_dir: Path, seed: int = 42):
        self.raw_zip_path = raw_zip_path
        self.output_dir = output_dir
        self.seed = seed
        random.seed(seed)

    def load_combined_coco(self) -> Dict:
        """
        Loads and aggregates annotations across train, valid, and test from raw zip
        into a single unified COCO catalog for stratified re-partitioning.
        """
        combined = {
            "info": {"description": "ONIONVISION Audited Combined COCO Catalog", "version": "1.0"},
            "licenses": [{"id": 1, "name": "CC BY 4.0"}],
            "categories": [
                {"id": 1, "name": "Red-Onion", "supercategory": "onion"},
                {"id": 2, "name": "Reference-Object", "supercategory": "reference"},
                {"id": 3, "name": "Yellow-Onion", "supercategory": "onion"},
            ],
            "images": [],
            "annotations": [],
        }

        with zipfile.ZipFile(self.raw_zip_path, "r") as z:
            ann_id_counter = 1
            for split in ["train", "valid", "test"]:
                with z.open(f"{split}/_annotations.coco.json") as f:
                    data = json.load(f)

                # Map images
                for img in data.get("images", []):
                    img_entry = dict(img)
                    img_entry["original_split"] = split
                    img_entry["zip_internal_path"] = f"{split}/{img['file_name']}"
                    combined["images"].append(img_entry)

                # Filter valid categories (ignore artifact ID 0)
                for ann in data.get("annotations", []):
                    if ann["category_id"] in [1, 2, 3]:
                        ann_entry = dict(ann)
                        ann_entry["id"] = ann_id_counter
                        ann_id_counter += 1
                        combined["annotations"].append(ann_entry)

        return combined

    def generate_stratified_splits(
        self, combined: Dict, train_ratio: float = 0.70, val_ratio: float = 0.15, test_ratio: float = 0.15
    ) -> Dict[str, List[int]]:
        """
        Generates balanced, stratified train/validation/test splits ensuring:
        - Both Red-Onion and Yellow-Onion are proportionally represented in all splits.
        - Exactly matches the seed for 100% reproducibility.
        """
        # Group images by onion variety presence
        img_id_to_cats = defaultdict(set)
        for ann in combined["annotations"]:
            img_id_to_cats[ann["image_id"]].add(ann["category_id"])

        strata = {
            "red_only": [],
            "yellow_only": [],
            "mixed": [],
            "reference_only": [],
        }

        for img in combined["images"]:
            cats = img_id_to_cats[img["id"]]
            has_red = 1 in cats
            has_yellow = 3 in cats
            if has_red and has_yellow:
                strata["mixed"].append(img["id"])
            elif has_red:
                strata["red_only"].append(img["id"])
            elif has_yellow:
                strata["yellow_only"].append(img["id"])
            else:
                strata["reference_only"].append(img["id"])

        split_assignment = {"train": [], "valid": [], "test": []}

        for stratum_name, img_ids in strata.items():
            shuffled = list(img_ids)
            random.shuffle(shuffled)
            n = len(shuffled)
            n_train = int(n * train_ratio)
            n_val = int(n * val_ratio)

            split_assignment["train"].extend(shuffled[:n_train])
            split_assignment["valid"].extend(shuffled[n_train : n_train + n_val])
            split_assignment["test"].extend(shuffled[n_train + n_val :])

        return split_assignment

    def coco_to_yolo_segmentation(self, bbox: List[float], segmentation: List[List[float]], img_w: int, img_h: int) -> str:
        """
        Utility for converting COCO polygon segmentation into YOLO polygon format
        normalized between [0.0, 1.0] for Phase 03 YOLOv8-seg training.
        """
        # YOLO polygon format: <class-index> x1 y1 x2 y2 ... xn yn
        lines = []
        for poly in segmentation:
            norm_pts = []
            for i in range(0, len(poly), 2):
                nx = min(1.0, max(0.0, poly[i] / img_w))
                ny = min(1.0, max(0.0, poly[i + 1] / img_h))
                norm_pts.append(f"{nx:.6f} {ny:.6f}")
            if len(norm_pts) >= 3:
                lines.append(" ".join(norm_pts))
        return "\n".join(lines)

    def export_yolo_dataset(self) -> Path:
        """
        Processes and extracts images and YOLO format segmentation labels
        into self.output_dir with train/val/test splits.
        """
        combined = self.load_combined_coco()
        splits = self.generate_stratified_splits(combined)

        # Map COCO category IDs: 1->0 (Red-Onion), 2->1 (Reference-Object), 3->2 (Yellow-Onion)
        coco_to_yolo_id = {1: 0, 2: 1, 3: 2}

        # Index annotations by image_id
        img_anns = defaultdict(list)
        for ann in combined["annotations"]:
            img_anns[ann["image_id"]].append(ann)

        img_lookup = {img["id"]: img for img in combined["images"]}

        split_dir_names = {"train": "train", "valid": "val", "test": "test"}

        # Prepare directories
        for split_key, dir_name in split_dir_names.items():
            (self.output_dir / "images" / dir_name).mkdir(parents=True, exist_ok=True)
            (self.output_dir / "labels" / dir_name).mkdir(parents=True, exist_ok=True)

        print(f"Extracting and exporting YOLOv8-seg dataset to: {self.output_dir}...")
        with zipfile.ZipFile(self.raw_zip_path, "r") as z:
            for split_key, img_ids in splits.items():
                dir_name = split_dir_names[split_key]
                print(f"  Exporting {split_key} split ({len(img_ids)} images)...")
                for img_id in img_ids:
                    img_info = img_lookup[img_id]
                    src_zip_path = img_info["zip_internal_path"]
                    dest_img_path = self.output_dir / "images" / dir_name / img_info["file_name"]
                    dest_lbl_path = self.output_dir / "labels" / dir_name / (Path(img_info["file_name"]).stem + ".txt")

                    # Extract image bytes
                    if not dest_img_path.exists():
                        dest_img_path.write_bytes(z.read(src_zip_path))

                    # Generate YOLO label lines
                    label_lines = []
                    anns = img_anns.get(img_id, [])
                    for ann in anns:
                        cid = ann["category_id"]
                        if cid not in coco_to_yolo_id:
                            continue
                        yolo_cls = coco_to_yolo_id[cid]
                        for poly in ann.get("segmentation", []):
                            norm_pts = []
                            for i in range(0, len(poly), 2):
                                nx = min(1.0, max(0.0, poly[i] / img_info["width"]))
                                ny = min(1.0, max(0.0, poly[i + 1] / img_info["height"]))
                                norm_pts.append(f"{nx:.6f} {ny:.6f}")
                            if len(norm_pts) >= 3:
                                label_lines.append(f"{yolo_cls} " + " ".join(norm_pts))

                    dest_lbl_path.write_text("\n".join(label_lines), encoding="utf-8")

        # Write dataset.yaml
        yaml_content = f"""# ONIONVISION YOLOv8-seg Dataset Configuration
path: {self.output_dir.resolve().as_posix()}
train: images/train
val: images/val
test: images/test

nc: 3
names:
  0: Red-Onion
  1: Reference-Object
  2: Yellow-Onion
"""
        yaml_path = self.output_dir / "dataset.yaml"
        yaml_path.write_text(yaml_content, encoding="utf-8")
        print(f"YOLO segmentation dataset exported successfully. Config: {yaml_path}")
        return yaml_path


if __name__ == "__main__":
    import sys
    raw_zip = Path.home() / "Downloads" / "Onion Segmentation.v7-full.coco.zip"
    out_dir = Path(__file__).resolve().parent.parent.parent / "data" / "processed" / "segmentation"
    preprocessor = SegmentationPreprocessor(raw_zip, out_dir)
    preprocessor.export_yolo_dataset()
