# Officer Profiles

Each officer profile is a JSON file named by badge number (e.g. `3.json`, `170.json`).

## Schema

| Field | Format | Description |
|---|---|---|
| `oldGamertag` | string | Old/previous gamertag(s). Use `/` to separate alts. |
| `newGamertag` | string | Current gamertag(s). Use `/` to separate alts. Primary (most important) goes first. |
| `steamId` | string | Steam ID(s). Use `/` to separate multiple. |
| `discord` | string | Discord username(s). Use `/` to separate multiple. |
| `email` | string | Email address(es). Use `/` to separate multiple. |
| `submittedAt` | string | ISO 8601 timestamp of submission (e.g. `"2026-07-17T14:30:00Z"`). Optional — if omitted, entry sorts to the end. |
| `message` | string | Freeform message field. |

## Example

```json
{
  "oldGamertag": "",
  "newGamertag": "l33t 0wn3r/Genetically Different",
  "steamId": "",
  "discord": "",
  "email": "",
  "message": "Founding member"
}
```

## Notes

- Fields can be left as empty strings if unknown.
- The `/` separator is consistent with the format used in `roster.html` for multiple gamertags/alts.
- Delete `000.json` — it's just a template.
