"""Drive the ESP8266 bicolor LED over WiFi (Consigne Additionnelle 1).

The back-office sends a single state; the ESP8266 runs the timing/blink pattern
itself (autonomous), so a dropped request can't freeze the LED mid-blink. If no
ESP is configured (ESP8266_URL unset) it runs in mock mode and just logs — so the
whole flow is demoable without the hardware.

LED state machine:
  OFF           default / idle
  GREEN_BLINK   identifier recognized, waiting for the password
  GREEN_30S     password OK: solid green 30 s, then off (access granted)
  RED_BLINK_10  password wrong: blink red 10×, then off (restart identification)
  RED_30S       not recognized: solid red 30 s, then off (re-enter identifier)
"""

from __future__ import annotations

import json
import os
import urllib.request

ESP_URL = os.environ.get("ESP8266_URL") or None  # e.g. http://192.168.137.50

STATES = {"OFF", "GREEN_BLINK", "GREEN_30S", "RED_BLINK_10", "RED_30S"}


def _log(state: str, mode: str):
    print(json.dumps({"service": "face-auth", "event": "led", "state": state, "mode": mode}))


def set_led(state: str) -> bool:
    """Send a LED state to the ESP8266. Never raises; returns True if delivered."""
    if state not in STATES:
        raise ValueError(f"unknown LED state: {state}")
    if not ESP_URL:
        _log(state, "mock")
        return False
    try:
        req = urllib.request.Request(
            f"{ESP_URL}/led", method="POST",
            data=json.dumps({"state": state}).encode(),
            headers={"content-type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=2).read()
        _log(state, "esp")
        return True
    except Exception as exc:  # hardware offline — degrade gracefully
        print(json.dumps({"service": "face-auth", "event": "led_failed",
                          "state": state, "error": str(exc)}))
        return False
