#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";

// For a local computer, replace with that computer's LAN IP, e.g.
// http://192.168.1.20:3000/api/readings
const char* API_URL = "http://YOUR_SERVER_IP:3000/api/readings";
const char* API_KEY = "smartdrop-demo-key";

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("WiFi connected");
}

void loop() {
  // Replace these demo values with calibrated sensor readings.
  float ph = 7.10;
  float ec = 420.0;
  float turbidity = 1.40;
  float temperature = 25.5;
  float reliability = 96.0;

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", API_KEY);

    JsonDocument doc;
    doc["device"] = "SmartDrop-01";
    doc["ph"] = ph;
    doc["ec"] = ec;
    doc["turbidity"] = turbidity;
    doc["temperature"] = temperature;
    doc["reliability"] = reliability;
    doc["anomaly"] = false;

    JsonObject health = doc["sensor_health"].to<JsonObject>();
    health["ph"] = "OK";
    health["ec"] = "OK";
    health["turbidity"] = "OK";
    health["temperature"] = "OK";

    String body;
    serializeJson(doc, body);

    int code = http.POST(body);
    Serial.printf("API response: %d\n", code);
    Serial.println(http.getString());
    http.end();
  }

  delay(10000);
}
