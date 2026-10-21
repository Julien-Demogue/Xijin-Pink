"""ML anomaly detector for the Xijin-Pink resilience demonstrator.

Pipeline: http_access logs -> FeatureSpec v1 windowed Observations ->
Stage1 (unsupervised normality) -> Stage2 (category) -> Alert.
"""

from .featurespec import (
    FEATURES,
    FEATURE_SPEC_VERSION,
    extract_observations,
    label_observations,
    scope_for_route,
)
from .model import Stage1Baseline, Stage2Classifier

__all__ = [
    "FEATURES",
    "FEATURE_SPEC_VERSION",
    "extract_observations",
    "label_observations",
    "scope_for_route",
    "Stage1Baseline",
    "Stage2Classifier",
]
