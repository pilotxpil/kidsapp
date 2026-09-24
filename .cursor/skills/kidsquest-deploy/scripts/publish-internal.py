#!/usr/bin/env python3
"""Roll out the KidsQuest internal-testing release on Google Play.

EAS submit leaves the release as a draft (eas.json releaseStatus). Testers do
not receive a draft. This replaces the internal track with that release set to
completed. Sending the previous completed release as halted in the same edit
fails ("can't halt a fully rolled out release and create a new fully rolled
out release in a single edit"). Leaving two completed releases fails too.

Usage:
  publish-internal.py --key /path/to/service-account.json [--version-code 21]
"""

from __future__ import annotations

import argparse
import base64
import json
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

PACKAGE = "com.kidsapp.quest"
TRACK = "internal"
SCOPE = "https://www.googleapis.com/auth/androidpublisher"
API = "https://androidpublisher.googleapis.com/androidpublisher/v3"


def b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def access_token(sa: dict) -> str:
    now = int(time.time())
    header = b64url(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
    claims = b64url(
        json.dumps(
            {
                "iss": sa["client_email"],
                "scope": SCOPE,
                "aud": "https://oauth2.googleapis.com/token",
                "iat": now,
                "exp": now + 3600,
            }
        ).encode()
    )
    signing_input = f"{header}.{claims}".encode()
    with tempfile.NamedTemporaryFile("w", suffix=".pem", delete=True) as key_file:
        key_file.write(sa["private_key"])
        key_file.flush()
        signature = subprocess.check_output(
            ["openssl", "dgst", "-sha256", "-sign", key_file.name],
            input=signing_input,
        )
    assertion = f"{header}.{claims}.{b64url(signature)}"
    body = urllib.parse.urlencode(
        {
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        }
    ).encode()
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=body,
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)["access_token"]


def api(token: str, method: str, path: str, payload: dict | None = None) -> dict:
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{API}/applications/{PACKAGE}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as err:
        detail = err.read().decode()
        raise SystemExit(f"Play API {err.code} {method} {path}: {detail}") from err


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--key", required=True)
    parser.add_argument("--version-code", type=int)
    args = parser.parse_args()

    with open(args.key, encoding="utf-8") as handle:
        sa = json.load(handle)
    token = access_token(sa)
    edit_id = api(token, "POST", "/edits", {})["id"]
    track = api(token, "GET", f"/edits/{edit_id}/tracks/{TRACK}")
    releases = track.get("releases") or []

    def codes(release: dict) -> list[str]:
        return [str(code) for code in release.get("versionCodes") or []]

    target = None
    if args.version_code is not None:
        wanted = str(args.version_code)
        for release in releases:
            if wanted in codes(release):
                target = release
                break
        if target is None:
            raise SystemExit(f"versionCode {wanted} not found on the {TRACK} track")
    else:
        drafts = [release for release in releases if release.get("status") == "draft"]
        if not drafts:
            completed = [release for release in releases if release.get("status") == "completed"]
            if len(completed) == 1:
                print(
                    "already-published",
                    completed[0].get("name"),
                    completed[0].get("versionCodes"),
                )
                api(token, "DELETE", f"/edits/{edit_id}")
                return
            raise SystemExit(f"no draft release on the {TRACK} track")
        target = max(drafts, key=lambda release: max(int(code) for code in codes(release)))

    if target.get("status") == "completed" and all(
        release is target or release.get("status") != "completed" for release in releases
    ):
        print("already-published", target.get("name"), target.get("versionCodes"))
        api(token, "DELETE", f"/edits/{edit_id}")
        return

    published = dict(target)
    published["status"] = "completed"
    api(
        token,
        "PUT",
        f"/edits/{edit_id}/tracks/{TRACK}",
        {"track": TRACK, "releases": [published]},
    )
    api(token, "POST", f"/edits/{edit_id}:commit")
    print("published", published.get("name"), published.get("versionCodes"))


if __name__ == "__main__":
    main()
