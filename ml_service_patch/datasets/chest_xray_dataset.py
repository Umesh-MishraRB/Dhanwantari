import os
import sys

import pandas as pd
import torch
from torch.utils.data import Dataset

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import CHEST_XRAY_LABELS, CHEST_XRAY_IMAGE_SIZE
from preprocessing.chest_xray_preprocessing import chest_xray_transform


class ChestXrayDataset(Dataset):
    """
    Multi-label dataset over the cleaned NIH ChestX-ray14 metadata CSV.
    Each sample: (1, H, W) float tensor, (14,) multi-hot label tensor.
    """

    def __init__(self, metadata_df: pd.DataFrame, image_size: int = CHEST_XRAY_IMAGE_SIZE, augment: bool = False):
        self.df = metadata_df.reset_index(drop=True)
        self.image_size = image_size
        self.augment = augment

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img = chest_xray_transform(row["image_path"], self.image_size, augment=self.augment)
        labels = row[CHEST_XRAY_LABELS].values.astype("float32")
        return torch.from_numpy(img), torch.from_numpy(labels)
