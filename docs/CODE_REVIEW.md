# HubRemote - Koodikatselmus ja tarkistuslista

## KORKEA PRIORITEETTI 🔴

### 1. ProtectedRoute autentikointi rikki
- **Tiedosto**: `src/components/ProtectedRoute.tsx:10`
- **Ongelma**: `isAuthenticated` kutsutaan väärin - funktioviittaus vs. funktiokutsu
- **Vaikutus**: Auth guard ei toimi oikein koska funktiot ovat aina truthy

### 2. Console.log-lauseet tuotantokoodissa
- `src/pages/Remote.tsx:37-46` - Debug session logging
- `src/pages/Library.tsx:59, 61, 113` - Query building debug logs
- `src/hooks/useTray.ts:25, 29` - Tray debug logs
- `src/hooks/useGlobalShortcuts.ts:29, 33, 50` - Shortcut debug logs
- `src/hooks/useRclone.ts:143, 150, 155` - Rclone debug logs

### 3. Duplikoitu `formatRuntime`-funktio
- `src/components/MediaCard.tsx:36-42`
- `src/components/HeroBanner.tsx:13-19`
- `src/components/EpisodeCard.tsx:11-14`
- `src/pages/ItemDetail.tsx:32-38`
- `src/components/RemotePanel.tsx:67-76` (formatTime variant)

---

## KESKITASO PRIORITEETTI 🟡

### 4. Puuttuvat aria-labelit
- `src/components/MediaCard.tsx:66-69` - Play-nappi ilman aria-labelia
- `src/components/EpisodeCard.tsx:57-59` - Nappi ilman saavutettavaa nimeä
- `src/pages/ItemDetail.tsx:301-315` - Useita nappeja ilman aria-labeleja

### 5. Liian monimutkaiset komponentit
- **RemotePanel.tsx** - 505 riviä, hallitsee liikaa toimintoja
- **Library.tsx** - Monimutkainen ehdollinen renderöinti
- **ItemDetail.tsx** - CastDialog ja SeriesContent pitäisi erottaa

### 6. Puuttuvat null-tarkistukset
- `src/components/RemotePanel.tsx:50-64` - Olettaa streamien olemassaolon
- `src/pages/ItemDetail.tsx:72` - Voi kaatua jos userId on null
- `src/pages/ItemDetail.tsx:351` - Studios.map ilman null-tarkistusta

### 7. UI-epäyhteneväisyydet
- Eri padding napeissa (px-4 py-1.5 vs px-1.5 py-0.5)
- Progress bar -tyyli vaihtelee tiedostojen välillä
- Korttien sisäinen välistys epäjohdonmukainen

### 8. Puuttuva input-validointi
- `src/pages/Library.tsx:58-106` - Ei validointia filtteri/sort-yhdistelmille
- `src/hooks/useUrlParams.ts:72-73` - parseInt tulosta ei validoida

---

## MATALA PRIORITEETTI 🟢

### 9. Suorituskyky
- Puuttuvat React.memo: Toast.tsx ToastItem
- Puuttuvat useMemo: Library.tsx genre/year extraction, Home.tsx array transformations
- Turhat uudelleenrenderöinnit

### 10. Duplikoituja koodimalleja
- Modal/overlay pattern toistuu (ItemDetail CastDialog, RemotePanel TrackMenu)
- Progress bar komponentti voisi olla uudelleenkäytettävä

### 11. Kovakoodatut magiset numerot
- `src/components/MediaRow.tsx:30-31` - scroll threshold 10px
- `src/pages/Library.tsx:11` - ITEMS_PER_PAGE = 24

### 12. Button-komponentti vs className
- Joissain paikoissa käytetään `<Button>` komponenttia
- Joissain paikoissa `className="btn-primary"` suoraan
- Epäjohdonmukainen käyttö

### 13. Tyhjät catch-lohkot
- `src/pages/Player.tsx:68-69` - Hiljainen virheiden nieleminen

---

## LISÄTARKISTUKSET

### 14. Lokalisointi
- Ovatko tekstit kovakoodattuja vai käytetäänkö i18n-järjestelmää?

### 15. Dark/Light mode
- Tuetaanko molempia vai vain dark mode?

### 16. Responsiivisuus
- Toimiiko kaikilla näyttökokoilla oikein?

### 17. Keyboard navigation
- Voiko sovellusta käyttää pelkällä näppäimistöllä?

### 18. Loading-tilat
- Onko kaikilla sivuilla loading-indikaattorit?

### 19. Error boundary
- Onko virherajapintoja paikoillaan kaikilla sivuilla?

### 20. Tyylitiedoston optimointi
- Onko käyttämättömiä CSS-luokkia?

---

## KORJAUSTEN TILA

- [x] 1. ProtectedRoute autentikointi ✅ (korjattu 2025-01-01)
- [x] 2. Console.log-lauseet ✅ (poistettu 2025-01-01)
- [x] 3. formatRuntime duplikaatio ✅ (siirretty src/utils/formatting.ts 2025-01-01)
- [ ] 4-20. Keskitason ja matalan prioriteetin korjaukset
