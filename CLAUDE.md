# CLAUDE.md — contexte projet (lu automatiquement par Claude Code)

Note de continuité : ce fichier sert à reprendre le projet sur n'importe quelle machine.
La conversation Claude ne suit pas d'un PC à l'autre ; **ce fichier + le README + l'historique git** sont la mémoire du projet.

## C'est quoi

Appli de **suivi de randonnée** : un randonneur partage sa position en direct, ses proches voient la trace + stats + alertes.
- **Serveur web** : `server.js` (Node + Express), déployé sur **Render** (gratuit). Sert aussi les pages web.
- **App Android** : dossier `app/` (Capacitor). Suit le GPS **en arrière-plan** et possède **2 modes** (Randonneur / Receveur).

Détails fonctionnels complets dans `README.md`.

## Repo & déploiement

- GitHub : https://github.com/baaaptiiste/ou-suis-je (public)
- Render : sert `https://ou-suis-je.onrender.com`. Variable d'env **`SHARE_SECRET`** = la clé secrète (n'est PAS dans le code).
- Releases GitHub : l'APK est publié comme asset (`gh release create vX.Y.Z RandoTracker.apk ...`).

## Architecture

```
server.js              API + statique. Etat EN MEMOIRE (pas de DB) : une "hike" = {active, startTs, arrived, label, points[]}
public/me.html         emetteur web
public/her.html        observateur web (carte Leaflet + trace + stats + alertes)
app/www/index.html     APP MOBILE : 3 ecrans (accueil / randonneur / receveur) dans un seul fichier
app/capacitor.config.json   appId = com.randotracker.app ; CapacitorHttp active
app/android/           projet natif genere par Capacitor
```

API (toutes exigent `?key=SHARE_SECRET`) : `POST /start /update /stop /arrived`, `GET /track`.

## Commandes

### Serveur web (local)
```bash
npm install
SHARE_SECRET=monsecret npm start        # PowerShell: $env:SHARE_SECRET="monsecret"; npm start
# me  : http://localhost:3000/me.html?key=monsecret
# her : http://localhost:3000/her.html?key=monsecret
```
Le déploiement Render se fait via `render.yaml` (Build `npm install`, Start `npm start`).

### App Android (build APK)
```bash
cd app
npm install
npx cap sync android
cd android
./gradlew.bat assembleDebug        # Windows ; APK -> app/android/app/build/outputs/apk/debug/app-debug.apk
```

### Tester l'app sur tél branché (USB debug)
```bash
adb install -r -g RandoTracker.apk
# Debug du webview : adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
# puis http://localhost:9222/json/list (Chrome DevTools Protocol)
```

## Pièges déjà rencontrés (ne pas refaire l'erreur)

1. **`Capacitor.registerPlugin is not a function`** dans le webview sans bundler → accéder aux plugins via fallback `Capacitor.Plugins[nom]`. (voir `reg()` dans `app/www/index.html`)
2. **CORS** : les fetch de l'app (origine `https://localhost`) vers Render étaient bloqués → activé **CapacitorHttp** (`plugins.CapacitorHttp.enabled=true`) = requêtes HTTP natives, plus de CORS.
3. **Permissions Android** : après `cap add android`, ré-ajouter manuellement dans `AndroidManifest.xml` : ACCESS_FINE/COARSE/BACKGROUND_LOCATION, FOREGROUND_SERVICE(+LOCATION), POST_NOTIFICATIONS, WAKE_LOCK. Et recréer `android/local.properties` (`sdk.dir=...`).
4. **Envoi position** : throttlé à 30 s max (`MIN_SEND_MS`) ; le GPS suit par distance (`distanceFilter: 10`).
5. **Sans réseau** : le GPS capte ; les points sont bufferisés (`queue` en localStorage, plafond 5000) et renvoyés en lot via `POST /batch` au retour réseau. Pas de transmission satellite (impossible sur tél standard).
6. **Batterie** : lisible Chrome Android, pas iOS.

## Toolchain (pour rebuild sur une nouvelle machine Windows)

- Node, JDK 17 (`winget install EclipseAdoptium.Temurin.17.JDK`)
- Android SDK cmdline-tools + `platform-tools`, `platforms;android-34`, `build-tools;34.0.0` (via `sdkmanager`)
- `JAVA_HOME` vers le JDK 17, `ANDROID_HOME` vers le SDK.

## Etat actuel / idées suivantes

- Fait : web + Render + app 2 modes + releases APK + buffer hors-ligne (`/batch`) + nom randonneur + carte sombre/clair + recentrer.
- Idées non faites : historique des sorties (DB), multi-randonneurs, APK signé release (Play Store), SOS, destination+ETA, export GPX, reconnexion Render après recréation du repo.
