# JARWO

Repo persona & konfigurasi untuk instance [Hermes Agent](https://github.com/NousResearch/hermes-agent) (Nous Research) bernama **JARWO**.

## Struktur

```
JARWO/
├── .github/
│   └── workflows/
│       └── hermes.yml      # validasi otomatis config.yaml & SOUL.md tiap push
├── hermes/
│   ├── config.yaml         # konfigurasi provider/model Hermes
│   └── SOUL.md             # persona & gaya bicara JARWO
├── .gitignore
└── README.md
```

## Cara pakai

1. Isi `hermes/SOUL.md` dengan persona JARWO yang sebenarnya, lalu salin ke `$HERMES_HOME/SOUL.md` (default: `~/.hermes/SOUL.md`).
2. Samakan `hermes/config.yaml` dengan hasil `hermes config get` di mesin Anda, lalu salin ke `$HERMES_HOME/config.yaml`.
3. Jalankan `hermes doctor` untuk memastikan semuanya terbaca dengan benar.

## Catatan

`hermes/config.yaml` dan `hermes/SOUL.md` di repo ini masih **template awal** — cek selalu dengan `hermes config get` dan [dokumentasi konfigurasi Hermes](https://hermes-agent.nousresearch.com/docs/user-guide/configuration) sebelum dipakai sungguhan.
