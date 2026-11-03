import os
import sys

import pandas as pd
import torch
from torch.utils.data import Dataset

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import SKIN_LABELS, SKIN_IMAGE_SIZE
from preprocessing.skin_preprocessing import skin_transform


class SkinDataset(Dataset):
    """
    Multi-class dataset over the cleaned HAM10000 metadata CSV.
    Each sample: (3, H, W) float tensor, scalar class-index label.
    """

    def __init__(self, metadata_df: pd.DataFrame, image_size: int = SKIN_IMAGE_SIZE, augment: bool = False):
        self.df = metadata_df.reset_index(drop=True)
        self.image_size = image_size
        self.augment = augment
        self.label_to_idx = {label: i for i, label in enumerate(SKIN_LABELS)}

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img = skin_transform(row["image_path"], self.image_size, augment=self.augment)
        label = self.label_to_idx[row["dx"]]
        return torch.from_numpy(img), torch.tensor(label, dtype=torch.long)
