// Hands the browser the keys for the photorealistic 3D descent: either a
// Google Maps key (Map Tiles API) or a free Cesium ion token with Google
// Photorealistic 3D Tiles added to My Assets. Both ship to the client, so
// restrict them to this site's domain. With neither set, the page falls back
// to the satellite map.
export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.status(200).send(JSON.stringify({
    googleMapsKey: process.env.GOOGLE_MAPS_API_KEY || "",
    cesiumIonToken: process.env.CESIUM_ION_TOKEN || "",
  }));
}
