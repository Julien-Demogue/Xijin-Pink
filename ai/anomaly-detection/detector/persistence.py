"""Save / load trained detector artifacts (scaler + PCA + IsolationForest +
threshold, and the stage-2 classifier). Plain pickle — scikit-learn estimators
pickle cleanly. The live scorer loads these at startup.
"""

from __future__ import annotations

import pickle
from pathlib import Path


def save(obj, path: str) -> str:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as fh:
        pickle.dump(obj, fh)
    return path


def load(path: str):
    with open(path, "rb") as fh:
        return pickle.load(fh)
