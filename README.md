# 🥾 Suivi de rando

Partage ta position en direct pendant une randonnée pour que tes proches (parents, famille, amis) voient où tu es, ta trace, et soient alertés en cas de souci.

Deux parties :

- **Serveur web** (Node + Express, déployé sur Render) — reçoit ta position et l'affiche sur une carte.
- **App Android** (Capacitor) — suit ta position **même écran éteint / en arrière-plan** et l'envoie au serveur.

La carte des observateurs s'ouvre dans un simple navigateur, rien à installer pour eux.

---

## Fonctionnalités

- 📍 **Trace en direct** : chemin parcouru dessiné sur la carte (OpenStreetMap + Leaflet, gratuit, pas de clé API).
- 📊 **Stats** : distance, durée, dénivelé +, vitesse, altitude, batterie, précision GPS.
- 🔔 **Alertes** côté observateur (bannière + bip) :
  - 🔴 **Perte de signal** : aucun point reçu depuis 5 min (tél éteint / pas de réseau)
  - 🟡 **Immobile** : pas bougé (< 60 m) depuis 15 min
  - 🟢 **Arrivé** : bouton « Je suis arrivé »
- 🔋 **Économe** : l'app n'envoie qu'au plus **toutes les 30 s** (moins de batterie/données).
- 📥 **Buffer hors-ligne** : si pas de réseau, les points GPS sont mis en file (localStorage, plafond 5000) et renvoyés en lot (`/batch`) au retour du réseau.
- 🙍 **Nom du randonneur** affiché côté receveur.
- 🗺️ **Carte sombre/clair** + bouton **recentrer** (mode receveur).
- 🔒 Protégé par une **clé secrète** partagée (`SHARE_SECRET`).

> Position stockée **en mémoire** du serveur (« live only ») : effacée au redémarrage, pas de base de données.

---

## Structure du projet

```
server.js          serveur Express (API + sert les pages web)
public/
  me.html          page émetteur web (envoie la position)
  her.html         page observateur (carte + trace + stats + alertes)
  index.html       page d'accueil
render.yaml        config déploiement Render
app/               app Android (Capacitor)
  www/index.html   interface de l'app + suivi background
  capacitor.config.json
  android/         projet Android natif généré
```

### API serveur

| Méthode | Route        | Rôle |
|---------|--------------|------|
| POST    | `/start`     | démarre une sortie (efface la trace) |
| POST    | `/update`    | ajoute un point GPS |
| POST    | `/stop`      | arrête la sortie |
| POST    | `/arrived`   | signale l'arrivée |
| GET     | `/track`     | renvoie toute la trace + méta (pour l'observateur) |

Toutes les routes exigent `?key=SHARE_SECRET`.

---

## Déploiement du serveur (Render, gratuit)

1. Le code est sur GitHub.
2. Sur https://render.com → **New** → **Blueprint** (lit `render.yaml`) ou **Web Service** :
   - Build Command : `npm install`
   - Start Command : `npm start`
   - Variable d'environnement `SHARE_SECRET` = une clé longue et privée.
3. Render fournit une URL HTTPS, ex : `https://ou-suis-je.onrender.com`.

**Liens d'usage :**
- Toi (web, sans l'app) : `https://ou-suis-je.onrender.com/me.html?key=TA_CLE`
- Observateurs : `https://ou-suis-je.onrender.com/her.html?key=TA_CLE`

> Plan gratuit Render : le serveur s'endort après inactivité → 1er chargement ~30 s.

### Tester le serveur en local

```bash
npm install
# PowerShell : $env:SHARE_SECRET="monsecret"; npm start
SHARE_SECRET=monsecret npm start
```

---

## App Android

L'app suit la position en arrière-plan (service premier-plan + notification) et envoie au serveur.

- `appId` : `com.randotracker.app`
- Plugins : `@capacitor-community/background-geolocation` (GPS fond), `@capacitor/device` (batterie), `CapacitorHttp` (requêtes natives → contourne le CORS).

### Build de l'APK

Pré-requis : Node, JDK 17, Android SDK (platform-tools, `platforms;android-34`, `build-tools;34.0.0`).

```bash
cd app
npm install
npx cap sync android
cd android
./gradlew.bat assembleDebug      # Windows ; sinon ./gradlew assembleDebug
```

APK généré : `app/android/app/build/outputs/apk/debug/app-debug.apk`

### Utilisation

1. Installer l'APK (autoriser « apps inconnues »).
2. Ouvrir **RandoTracker** → saisir l'URL du serveur + la clé.
3. Choisir le mode :
   - **🥾 Je randonne** → **Démarrer la rando** → autoriser la localisation **« Toujours »** + notifications. Suit en arrière-plan.
   - **👁️ Je suis une rando** → carte + trace + stats + alertes, directement dans l'app (pas besoin de navigateur).

Les observateurs peuvent aussi utiliser la page web `/her.html?key=TA_CLE` s'ils préfèrent.

Pour la fiabilité : désactiver l'**optimisation batterie** pour l'app (sinon Android peut la couper en fond).

---

## Limites

- **Sans réseau** : le GPS capte hors réseau ; les points sont bufferisés et renvoyés au retour du réseau. Tant qu'aucun réseau ne revient, le receveur ne voit pas les nouveaux points (pas de transmission satellite).
- L'APK est en **signature debug** : OK pour usage perso (sideload), pas pour le Play Store.
- Trace non persistante : perdue au redémarrage du serveur.
- Batterie lisible sur Chrome Android, **pas sur iPhone/Safari**.
