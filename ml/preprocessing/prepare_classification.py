#!/usr/bin/env python3
"""
ONIONVISION — Quality Classification Dataset Preprocessing & Preparation Module
Target Dataset: Image Dataset of Red and White Onion Bulbs and Leaves (Mendeley Data)

Audit Findings Addressed:
1. Dataset contains 4,040 leaf images which must be filtered out for bulb quality inspection.
2. Dataset contains 12,260 onion bulb images categorized into Healthy vs Unhealthy.
3. 28 duplicate clusters (29 duplicate file instances) must be deduplicated to prevent train/test leakage.
4. Binary quality task: 'Healthy' (Sound) vs 'Unhealthy' (Defective).
5. 4-class multi-task: 'Healthy_Red', 'Healthy_White', 'Unhealthy_Red', 'Unhealthy_White'.
"""

import hashlib
import json
import random
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import zipfile


class ClassificationPreprocessor:
    """Handles filtering, deduplication, stratification, and dataset preparation for quality models."""

    def __init__(self, raw_zip_path: Path, output_dir: Path, seed: int = 42):
        self.raw_zip_path = raw_zip_path
        self.output_dir = output_dir
        self.seed = seed
        random.seed(seed)

    def scan_and_filter_bulbs(self) -> List[Dict]:
        """
        Scans archive entries, filters for bulb images only, extracts labels,
        and computes hashes for exact deduplication.
        """
        bulb_records = []
        seen_hashes = {}
        duplicates_removed = 0

        with zipfile.ZipFile(self.raw_zip_path, "r") as z:
            for name in z.namelist():
                if not name.endswith(".jpg"):
                    continue

                parts = name.replace("\\", "/").split("/")
                # Filter strictly for Bulbs (ignore Leaves)
                if len(parts) < 3 or "Bulb" not in parts[1]:
                    continue

                category_path = "/".join(parts[1:-1])

                # Binary Health Label
                is_healthy = "Healthy" in parts[2] and "Unhealthy" not in parts[2]
                quality_label = "Healthy" if is_healthy else "Unhealthy"

                # Variety Label
                is_red = "Red Onion" in category_path
                is_white = "White Onion" in category_path
                variety_label = "Red" if is_red else ("White" if is_white else "Unknown")

                # Sample count (Single vs Multiple)
                is_single = "Single" in category_path
                sample_type = "Single" if is_single else "Multiple"

                # Hash check for deduplication
                img_data = z.read(name)
                h = hashlib.md5(img_data).hexdigest()

                if h in seen_hashes:
                    duplicates_removed += 1
                    continue
                seen_hashes[h] = name

                bulb_records.append({
                    "internal_zip_path": name,
                    "filename": Path(name).name,
                    "md5_hash": h,
                    "category_path": category_path,
                    "quality_label": quality_label,
                    "variety_label": variety_label,
                    "sample_type": sample_type,
                    "compound_class": f"{quality_label}_{variety_label}",
                })

        print(f"Scanned bulb images: {len(bulb_records)} (Removed {duplicates_removed} duplicates)")
        return bulb_records

    def generate_stratified_splits(
        self, records: List[Dict], train_ratio: float = 0.70, val_ratio: float = 0.15, test_ratio: float = 0.15
    ) -> Dict[str, List[Dict]]:
        """
        Generates reproducible stratified splits across the compound classes
        (Healthy_Red, Healthy_White, Unhealthy_Red, Unhealthy_White) and sample type (Single vs Multiple).
        """
        strata = defaultdict(list)
        for r in records:
            stratum_key = f"{r['compound_class']}_{r['sample_type']}"
            strata[stratum_key].append(r)

        splits = {"train": [], "valid": [], "test": []}

        for stratum_key, items in strata.items():
            shuffled = list(items)
            random.shuffle(shuffled)
            n = len(shuffled)
            n_train = int(n * train_ratio)
            n_val = int(n * val_ratio)

            splits["train"].extend(shuffled[:n_train])
            splits["valid"].extend(shuffled[n_train : n_train + n_val])
            splits["test"].extend(shuffled[n_train + n_val :])

        print(f"Splits generated — Train: {len(splits['train'])}, Valid: {len(splits['valid'])}, Test: {len(splits['test'])}")
        return splits

    def export_classification_dataset(self) -> Path:
        """
        Extracts filtered and deduplicated bulb images into PyTorch ImageFolder
        compatible directory structure:
        output_dir/
          train/Healthy/, train/Unhealthy/
          val/Healthy/, val/Unhealthy/
          test/Healthy/, test/Unhealthy/
        """
        records = self.scan_and_filter_bulbs()
        splits = self.generate_stratified_splits(records)

        split_dir_names = {"train": "train", "valid": "val", "test": "test"}

        # Prepare directories
        for split_key, dir_name in split_dir_names.items():
            for label in ["Healthy", "Unhealthy"]:
                (self.output_dir / dir_name / label).mkdir(parents=True, exist_ok=True)

        print(f"Exporting classification dataset to: {self.output_dir}...")
        with zipfile.ZipFile(self.raw_zip_path, "r") as z:
            for split_key, items in splits.items():
                dir_name = split_dir_names[split_key]
                print(f"  Exporting {split_key} split ({len(items)} images)...")
                for item in items:
                    label = item["quality_label"]
                    src_zip_path = item["internal_zip_path"]
                    dest_path = self.output_dir / dir_name / label / item["filename"]
                    if not dest_path.exists():
                        dest_path.write_bytes(z.read(src_zip_path))

        # Save manifest
        summary = {
            "total_images": len(records),
            "splits": {
                "train": len(splits["train"]),
                "val": len(splits["valid"]),
                "test": len(splits["test"]),
            },
            "class_counts": {
                "Healthy": sum(1 for r in records if r["quality_label"] == "Healthy"),
                "Unhealthy": sum(1 for r in records if r["quality_label"] == "Unhealthy"),
            },
            "classes": ["Healthy", "Unhealthy"],
        }
        summary_path = self.output_dir / "classification_dataset_summary.json"
        summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
        print(f"Classification dataset exported successfully. Summary: {summary_path}")
        return self.output_dir


if __name__ == "__main__":
    import sys
    inner_zip = Path(__file__).resolve().parent.parent / "datasets" / "working" / "dataset_02" / "Image Dataset of Red and White Onion Bulbs and Lea" / "Onion Leaves and Bulb Dataset.zip"
    out_dir = Path(__file__).resolve().parent.parent.parent / "data" / "processed" / "classification"
    preprocessor = ClassificationPreprocessor(inner_zip, out_dir)
    preprocessor.export_classification_dataset()
