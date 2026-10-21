# ESP8266 bicolor-LED indicator

Connected object (Consigne Additionnelle 1): an ESP8266 joins the solution's WiFi
hotspot and reflects the back-office auth state on a **red/green bicolor LED**.

> The imposed IDE (JetBrains CLion + PlatformIO) is relaxed for now — this builds
> with the PlatformIO CLI, the CLion+PlatformIO plugin, or the Arduino IDE
> (rename `src/main.cpp` → `.ino`).

## Behaviour

The back-office (`services/face-auth`) sends **one state** via `POST /led`; the
firmware runs the pattern itself, so a dropped request never freezes the LED.

| State | LED | Meaning |
| --- | --- | --- |
| `OFF` | off | idle / default |
| `GREEN_BLINK` | green blinking | recognized, waiting for the password |
| `GREEN_30S` | green solid 30 s → off | password OK, access granted |
| `RED_BLINK_10` | red blinks 10× → off | wrong password, restart identification |
| `RED_30S` | red solid 30 s → off | not recognized, re-enter identifier |

## Wiring

Bicolor LED: **green → D1 (GPIO5)**, **red → D2 (GPIO4)**, common leg to GND via a
resistor. Adjust pins / active level at the top of `src/main.cpp`.

## Configure & flash

Edit `WIFI_SSID` / `WIFI_PASS` in `src/main.cpp` (the hotspot `RESILIENCE-G<n>`),
then:

```bash
pio run -t upload        # PlatformIO CLI
pio device monitor       # see the assigned IP, e.g. 192.168.137.50
```

Point the back-office at it: `ESP8266_URL=http://<esp-ip>` when starting
`services/face-auth`. Check it: `curl http://<esp-ip>/health`.
