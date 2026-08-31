# Maison

Property app for hosts and invited guests: calendars, stay requests, house info, and maintenance. Repo name is **EstateAid**; product name is **Maison**.

## Run

```bash
npm install
npx expo start
```

Also: `npm run ios`, `npm run android`, `npm run web`, or `npm run start:dev` for a development client.

Scheme: `estateaid`. Bundle: `com.estateaid.app`.

## Stack

- Expo Router (file-based routes in `app/`)
- Supabase (auth, Postgres + RLS, storage)
- RevenueCat (Maison Pro)
- Zustand stores in `store/`

## Docs

- [Paywall & entitlement](docs/PAYWALL.md)
- [RevenueCat + Supabase](docs/REVENUECAT.md)
