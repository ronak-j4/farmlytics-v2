def convert_to_labels(predictions):
    """
    Convert predicted numeric output into Low / Medium / High
    Using thresholds:
    0.0 – 0.4 → Low
    0.4 – 0.7 → Medium
    0.7 – 1.0 → High
    """
    labels = {}
    for i, pred in enumerate(predictions):
        if pred < 0.4:
            label = "Low"
        elif pred < 0.7:
            label = "Medium"
        else:
            label = "High"
        labels[f"Day {i+1}"] = label
    return labels
