// ESP8266 bicolor-LED indicator — Consigne Additionnelle 1.
//
// Joins the solution's WiFi hotspot and exposes POST /led {"state":"..."} .
// The back-office (services/face-auth) sends ONE state; the ESP runs the timing
// and blink pattern itself (autonomous), so a lost request can't freeze the LED.
//
// States:
//   OFF            both off (default / idle)
//   GREEN_BLINK    green blinks until the next command (waiting for password)
//   GREEN_30S      green solid 30 s, then OFF (password OK -> access granted)
//   RED_BLINK_10   red blinks 10 times, then OFF (wrong password -> restart)
//   RED_30S        red solid 30 s, then OFF (not recognized -> re-enter id)
//
// Wiring: bicolor LED, GREEN on D1 (GPIO5), RED on D2 (GPIO4), common to GND
// through a resistor. Adjust the pins/active level below for your LED.

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

const char *WIFI_SSID = "RESILIENCE-G0";       // the solution hotspot
const char *WIFI_PASS = "change-me";           // hotspot password

const uint8_t GREEN_PIN = D1;
const uint8_t RED_PIN = D2;

ESP8266WebServer server(80);

enum State { OFF, GREEN_BLINK, GREEN_30S, RED_BLINK_10, RED_30S };
State state = OFF;
unsigned long stateStart = 0;   // millis() when the state began
unsigned long lastToggle = 0;
bool phase = false;             // current on/off phase for blinking
int toggles = 0;               // toggle counter for RED_BLINK_10

void green(bool on) { digitalWrite(GREEN_PIN, on ? HIGH : LOW); }
void red(bool on)   { digitalWrite(RED_PIN, on ? HIGH : LOW); }
void bothOff()      { green(false); red(false); }

void enter(State s) {
  state = s;
  stateStart = millis();
  lastToggle = millis();
  phase = false;
  toggles = 0;
  bothOff();
}

void handleLed() {
  String body = server.arg("plain");
  State next = OFF;
  if (body.indexOf("GREEN_BLINK") >= 0) next = GREEN_BLINK;
  else if (body.indexOf("GREEN_30S") >= 0) next = GREEN_30S;
  else if (body.indexOf("RED_BLINK_10") >= 0) next = RED_BLINK_10;
  else if (body.indexOf("RED_30S") >= 0) next = RED_30S;
  else next = OFF;
  enter(next);
  server.send(200, "application/json", "{\"ok\":true}");
}

void setup() {
  Serial.begin(115200);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(RED_PIN, OUTPUT);
  bothOff();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print("."); }
  Serial.printf("\nconnected, IP=%s\n", WiFi.localIP().toString().c_str());

  server.on("/led", HTTP_POST, handleLed);
  server.on("/health", HTTP_GET, []() { server.send(200, "application/json", "{\"status\":\"ok\"}"); });
  server.begin();
}

void loop() {
  server.handleClient();
  unsigned long now = millis();

  switch (state) {
    case OFF:
      bothOff();
      break;

    case GREEN_BLINK:
      if (now - lastToggle >= 500) { phase = !phase; green(phase); lastToggle = now; }
      break;

    case GREEN_30S:
      green(true);
      if (now - stateStart >= 30000) enter(OFF);
      break;

    case RED_30S:
      red(true);
      if (now - stateStart >= 30000) enter(OFF);
      break;

    case RED_BLINK_10:
      if (now - lastToggle >= 250) {
        phase = !phase; red(phase); lastToggle = now;
        if (++toggles >= 20) enter(OFF);   // 20 toggles = 10 on/off blinks
      }
      break;
  }
}
