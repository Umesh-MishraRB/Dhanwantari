import torch.nn as nn

from models.common import ConvBlock


class ChestXrayCNN(nn.Module):
    """
    Multi-label classifier over 14 thoracic findings from a single-channel
    (grayscale) chest X-ray. Outputs raw logits — use BCEWithLogitsLoss at
    training time and sigmoid at inference time (a single X-ray can show
    several findings simultaneously, so this is NOT softmax/multi-class).
    """

    def __init__(self, num_labels: int = 14, in_channels: int = 1):
        super().__init__()
        self.features = nn.Sequential(
            ConvBlock(in_channels, 32),   # 224 -> 112
            ConvBlock(32, 64),            # 112 -> 56
            ConvBlock(64, 128),           # 56 -> 28
            ConvBlock(128, 256),          # 28 -> 14
            ConvBlock(256, 256),          # 14 -> 7
        )
        self.global_pool = nn.AdaptiveAvgPool2d(1)
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.4),
            nn.Linear(256, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(128, num_labels),  # logits, one per finding
        )

    def forward(self, x):
        x = self.features(x)
        x = self.global_pool(x)
        return self.classifier(x)
