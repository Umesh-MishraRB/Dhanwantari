import torch.nn as nn

from models.common import ConvBlock


class MRIClassifierCNN(nn.Module):
    """
    Multi-class classifier over 4 brain MRI categories (glioma, meningioma,
    pituitary, no tumor) from a single-channel MRI slice. Outputs raw
    logits — use CrossEntropyLoss at training time and softmax at
    inference time.
    """

    def __init__(self, num_classes: int = 4, in_channels: int = 1):
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
            nn.Linear(128, num_classes),
        )

    def forward(self, x):
        x = self.features(x)
        x = self.global_pool(x)
        return self.classifier(x)
