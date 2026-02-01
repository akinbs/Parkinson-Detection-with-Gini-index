from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Literal, Optional
import pandas as pd
import joblib
from io import BytesIO
import numpy as np

app = FastAPI(title="Parkinson Tahmin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "parkinson_modeli.pkl"

try:
    model = joblib.load(MODEL_PATH)
except Exception as e:
    print("Model yüklenemedi:", e)
    model = None

FEATURE_COLUMNS = [
    "MDVP:Fo(Hz)", "MDVP:Fhi(Hz)", "MDVP:Flo(Hz)",
    "MDVP:Jitter(%)", "MDVP:Jitter(Abs)", "MDVP:RAP", "MDVP:PPQ",
    "Jitter:DDP", "MDVP:Shimmer", "MDVP:Shimmer(dB)", "Shimmer:APQ3",
    "Shimmer:APQ5", "MDVP:APQ", "Shimmer:DDA", "NHR", "HNR", "RPDE",
    "DFA", "spread1", "spread2", "D2", "PPE",
]

NAME_COLUMN = "name"
STATUS_COLUMN = "status"


def _read_uploaded_file(file: UploadFile) -> pd.DataFrame:
    contents = file.file.read()

    if file.filename.lower().endswith(".csv"):
        df = pd.read_csv(BytesIO(contents))
    elif file.filename.lower().endswith((".xlsx", ".xls")):
        df = pd.read_excel(BytesIO(contents))
    else:
        raise HTTPException(
            status_code=400,
            detail="Sadece .csv veya .xlsx/.xls dosyaları destekleniyor.",
        )

    
    df.columns = [str(c).strip() for c in df.columns]
    return df


def _check_columns(df: pd.DataFrame):
    missing = [col for col in FEATURE_COLUMNS if col not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Eksik kolon(lar) var: {missing}. Lütfen veri setini kontrol edin.",
        )


def _coerce_features_to_numeric(df: pd.DataFrame) -> pd.DataFrame:
    """
    Feature kolonlarını güvenli şekilde sayısala çevirir:
    - '12,34' -> '12.34'
    - boş/bozuk değer -> NaN
    """
    X = df[FEATURE_COLUMNS].copy()

    for col in FEATURE_COLUMNS:
        
        s = X[col].astype(str).str.replace(",", ".", regex=False)

        
        X[col] = pd.to_numeric(s, errors="coerce")

    
    nan_counts = X.isna().sum()
    total_nans = int(nan_counts.sum())
    if total_nans > 0:
        bad_cols = nan_counts[nan_counts > 0].to_dict()
        raise HTTPException(
            status_code=400,
            detail=(
                "Feature kolonlarında sayısala çevrilemeyen değerler bulundu (NaN oluştu). "
                f"Sorunlu kolonlar: {bad_cols}. "
                "Not: Ondalıklar virgüllüyse (12,34) desteklenir; ama metin vb. değerler temizlenmeli."
            ),
        )


    return X


def _safe_probability_output(raw_scores):
    scores = raw_scores.astype(float)
    mn, mx = scores.min(), scores.max()
    if mx - mn < 1e-8:
        return np.ones_like(scores) * 0.5
    return (scores - mn) / (mx - mn)


from pydantic import BaseModel


class PredictionRow(BaseModel):
    name: str
    probability: float
    predictedLabel: Literal["Parkinson", "Healthy"]
    trueLabel: Optional[Literal["Parkinson", "Healthy"]] = None


@app.post("/predict-parkinsons", response_model=List[PredictionRow])
async def predict_parkinsons(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(
            status_code=500,
            detail="Model yüklenemedi. Sunucu tarafını kontrol edin.",
        )

    df = _read_uploaded_file(file)
    _check_columns(df)

    
    if NAME_COLUMN in df.columns:
        names = df[NAME_COLUMN].astype(str).tolist()
    else:
        names = [f"Patient {i+1}" for i in range(len(df))]

    
    true_labels = None
    if STATUS_COLUMN in df.columns:
        def map_status(x):
            try:
                x_int = int(x)
            except Exception:
                return None
            return "Parkinson" if x_int == 1 else "Healthy"
        true_labels = df[STATUS_COLUMN].map(map_status).tolist()

    
    X = _coerce_features_to_numeric(df)

    
    try:
        proba = model.predict_proba(X)[:, 1]
    except AttributeError:
        scores = model.decision_function(X)
        proba = _safe_probability_output(scores)

   
    uniq = np.unique(np.round(proba, 6))
    print(f"[DEBUG] rows={len(df)} unique_proba_count={len(uniq)} sample_unique_proba={uniq[:10]}")

    preds = (proba >= 0.5).astype(int)

    result: List[PredictionRow] = []
    for i in range(len(df)):
        label = "Parkinson" if preds[i] == 1 else "Healthy"
        true_label = true_labels[i] if true_labels is not None else None
        result.append(
            PredictionRow(
                name=names[i],
                probability=float(proba[i]),
                predictedLabel=label,
                trueLabel=true_label,
            )
        )

    return result
