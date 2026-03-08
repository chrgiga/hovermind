chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzeText") {
    fetchWikipediaSummary(request.text)
      .then(result => sendResponse({ result: result }))
      .catch(error => {
        sendResponse({ result: "Hubo un problema de conexión con Wikipedia." });
      });
    return true; // Indicates we will respond asynchronously
  }
});

async function fetchWikipediaSummary(query) {
  const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.type === 'standard') {
        return `<p>${data.extract}</p>`;
      } else if (data.type === 'disambiguation') {
        return "<p>La búsqueda es ambigua. Por favor, sé más específico.</p>";
      } else {
        return "<p>No se encontró un resumen exacto en Wikipedia.</p>";
      }
    } else if (response.status === 404) {
      return "<p>No se encontraron resultados en Wikipedia para esta selección.</p>";
    } else {
      return "<p>Hubo un problema al consultar Wikipedia.</p>";
    }
  } catch (e) {
    return "<p>Error de red al intentar consultar Wikipedia.</p>";
  }
}