import torch.nn as nn


class ConvBlock(nn.Module):
    """Conv -> BatchNorm -> ReLU -> (optional) MaxPool, the repeated unit
    used to build each modality's CNN. Factored out so all three models
    share one tested building block instead of three subtly different ones."""

    def __init__(self, in_channels, out_channels, pool=True):
        super().__init__()
        layers = [
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        ]
        if pool:
            layers.append(nn.MaxPool2d(2))
        self.block = nn.Sequential(*layers)

    def forward(self, x):
        return self.block(x)
