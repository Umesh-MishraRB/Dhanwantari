import os
import sys

import pandas as pd
import torch
from torch.utils.data import Dataset

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import MRI_LABELS, MRI_IMAGE_SIZE
from preprocessing.mri_preprocessing import mri_transform


class MRIDataset(Dataset):
    """
    Multi-class dataset over the cleaned Brain Tumor MRI metadata CSV.
    Each sample: (1, H, W) float tensor, scalar class-index label.
    """

    def __init__(self, metadata_df: pd.DataFrame, image_size: int = MRI_IMAGE_SIZE, augment: bool = False):
        self.df = metadata_df.reset_index(drop=True)
        self.image_size = image_size
        self.augment = augment
        self.label_to_idx = {label: i for i, label in enumerate(MRI_LABELS)}

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img = mri_transform(row["image_path"], self.image_size, augment=self.augment)
        label = self.label_to_idx[row["label"]]
        return torch.from_numpy(img), torch.tensor(label, dtype=torch.long)
