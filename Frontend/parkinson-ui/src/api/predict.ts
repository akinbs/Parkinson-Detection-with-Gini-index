export async function predictParkinson(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("http://localhost:8000/predict-parkinsons", {
    method: "POST",
    body: formData,
  });

  return res.json();
}
