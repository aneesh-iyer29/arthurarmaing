// Hands the browser the Google Maps key for the photorealistic 3D descent.
// The key ships to the client either way, so restrict it in Google Cloud to
// this site's domain and to the Map Tiles API. With no key set, the page
// falls back to the free satellite map.
export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.status(200).send(JSON.stringify({ googleMapsKey: process.env.GOOGLE_MAPS_API_KEY || "" }));
}
