import torch.nn as nn

from models.common import ConvBlock


class SkinLesionCNN(nn.Module):
    """
    Multi-class classifier over the 7 HAM10000 dx categories, from a
    3-channel dermatoscopic image. Outputs raw logits — use
    CrossEntropyLoss (ideally class-weighted, since HAM10000 is heavily
    imbalanced toward 'nv') at training time and softmax at inference time.
    Slightly wider than the chest X-ray CNN since color/texture/boundary
    cues matter more here than in grayscale anatomy.
    """

    def __init__(self, num_classes: int = 7, in_channels: int = 3):
        super().__init__()
        self.features = nn.Sequential(
            ConvBlock(in_channels, 32),   # 224 -> 112
            ConvBlock(32, 64),            # 112 -> 56
            ConvBlock(64, 128),           # 56 -> 28
            ConvBlock(128, 256),          # 28 -> 14
            ConvBlock(256, 512),          # 14 -> 7
        )
        self.global_pool = nn.AdaptiveAvgPool2d(1)
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.5),
            nn.Linear(512, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes),
        )

    def forward(self, x):
        x = self.features(x)
        x = self.global_pool(x)
        return self.classifier(x)
