
import React, { useState } from "react";

type PredictionRow = {
  name: string;
  probability: number;       
  predictedLabel: "Parkinson" | "Healthy";
  trueLabel?: "Parkinson" | "Healthy";
};

const REQUIRED_COLUMNS = [
  "name",
  "MDVP:Fo(Hz)",
  "MDVP:Fhi(Hz)",
  "MDVP:Flo(Hz)",
  "MDVP:Jitter(%)",
  "MDVP:Jitter(Abs)",
  "MDVP:RAP",
  "MDVP:PPQ",
  "Jitter:DDP",
  "MDVP:Shimmer",
  "MDVP:Shimmer(dB)",
  "Shimmer:APQ3",
  "Shimmer:APQ5",
  "MDVP:APQ",
  "Shimmer:DDA",
  "NHR",
  "HNR",
  "RPDE",
  "DFA",
  "spread1",
  "spread2",
  "D2",
  "PPE",
];

export const ParkinsonPredictor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [filter, setFilter] = useState<"all" | "parkinson" | "healthy">("all");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;


    if (!f.name.endsWith(".csv") && !f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
      setError("Lütfen .csv veya .xlsx formatında bir dosya yükleyin.");
      setFile(null);
      return;
    }

    setError(null);
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Lütfen önce bir dosya yükleyin.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      
      const response = await fetch("http://localhost:8000/predict-parkinsons", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Sunucudan geçerli bir yanıt alınamadı.");
      }

      const data: PredictionRow[] = await response.json();
      setPredictions(data);
    } catch (err: any) {
      setError(err.message ?? "Bilinmeyen bir hata oluştu.");
    } finally {
      setIsUploading(false);
    }
  };

  const filteredPredictions = predictions.filter((row) => {
    if (filter === "all") return true;
    if (filter === "parkinson") return row.predictedLabel === "Parkinson";
    if (filter === "healthy") return row.predictedLabel === "Healthy";
    return true;
  });

  const total = predictions.length;
  const parkinsonCount = predictions.filter(
    (p) => p.predictedLabel === "Parkinson"
  ).length;
  const healthyCount = predictions.filter(
    (p) => p.predictedLabel === "Healthy"
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-5xl space-y-8">
        
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Parkinson Risk Tahmin Paneli
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            CSV/Excel dosyanızı yükleyin,
            model her hasta için Parkinson riskini tahmin etsin.
          </p>
        </header>

        
        <div className="flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
              1
            </span>
            <span>Veri Yükle</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
              2
            </span>
            <span>Modele Gönder</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
              3
            </span>
            <span>Sonuçları İncele</span>
          </div>
        </div>

        
        <div className="grid md:grid-cols-3 gap-6">
          
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-lg">Veri Yükleme</h2>
            <p className="text-sm text-slate-600">
              .csv veya .xlsx formatında, sütun başlıkları modelin eğitildiği
              formatta olmalıdır.
            </p>

            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition">
              <span className="text-sm text-slate-600">
                Dosyayı buraya sürükleyin veya tıklayıp seçin
              </span>
              <span className="mt-1 text-xs text-slate-500">
                Desteklenen formatlar: .csv, .xlsx
              </span>
              <input
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
              />
            </label>

            {file && (
              <div className="text-xs text-slate-600">
                <div>
                  <span className="font-medium">Seçili dosya: </span>
                  {file.name}
                </div>
                <div>Boyut: {(file.size / 1024).toFixed(1)} KB</div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!file || isUploading}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isUploading ? "Model çalışıyor..." : "Modele Gönder"}
            </button>
          </div>

          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
            <h3 className="font-semibold text-sm">Beklenen sütunlar</h3>
            <p className="text-xs text-slate-600">
              Dosyanız aşağıdaki özellikleri içermelidir:
            </p>
            <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
              {REQUIRED_COLUMNS.map((col) => (
                <span
                  key={col}
                  className="text-[11px] bg-slate-100 rounded-full px-2 py-0.5"
                >
                  {col}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Opsiyonel: <code>status</code> kolonu varsa, gerçek etiketlerle
              karşılaştırma yapılabilir.
            </p>
          </div>
        </div>

        
        {predictions.length > 0 && (
          <section className="space-y-4">
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">Toplam Hasta</div>
                <div className="text-2xl font-semibold">{total}</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">
                  Tahmini Parkinson
                </div>
                <div className="text-2xl font-semibold text-rose-600">
                  {parkinsonCount}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">
                  Tahmini Sağlıklı
                </div>
                <div className="text-2xl font-semibold text-emerald-600">
                  {healthyCount}
                </div>
              </div>
            </div>

            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="font-semibold text-sm">
                  Hasta Bazında Tahminler
                </h2>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1 rounded-full border ${
                      filter === "all"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    Tümü
                  </button>
                  <button
                    onClick={() => setFilter("parkinson")}
                    className={`px-3 py-1 rounded-full border ${
                      filter === "parkinson"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    Parkinson
                  </button>
                  <button
                    onClick={() => setFilter("healthy")}
                    className={`px-3 py-1 rounded-full border ${
                      filter === "healthy"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    Sağlıklı
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-[11px] text-slate-500">
                      <th className="px-3 py-2 font-medium">Hasta</th>
                      <th className="px-3 py-2 font-medium">Tahmin</th>
                      <th className="px-3 py-2 font-medium">
                        Olasılık (Parkinson)
                      </th>
                      {filteredPredictions.some((p) => p.trueLabel) && (
                        <th className="px-3 py-2 font-medium">Gerçek Etiket</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPredictions.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              row.predictedLabel === "Parkinson"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {row.predictedLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {(row.probability * 100).toFixed(1)}%
                        </td>
                        {row.trueLabel && (
                          <td className="px-3 py-2 text-slate-700">
                            {row.trueLabel}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
