# 📍 Partage de position à la demande

Petite page web : un téléphone envoie sa position GPS, une autre personne la voit sur une carte quand elle veut. Suivre où se trouve quelqu'un (proche, famille, ami…) — pas forcément un couple.

- `me.html` → page **émetteur** (envoie sa position)
- `her.html` → page **observateur** (voit la position sur carte)
- Carte = OpenStreetMap + Leaflet (gratuit, pas de clé API)
- Position stockée en mémoire du serveur (effacée au redémarrage)
- Protégé par une clé secrète partagée (`SHARE_SECRET`)

## Tester en local

```bash
npm install
SHARE_SECRET=monsecret npm start      # Windows PowerShell: $env:SHARE_SECRET="monsecret"; npm start
```

- Toi  : http://localhost:3000/me.html?key=monsecret
- Elle : http://localhost:3000/her.html?key=monsecret

> Le GPS du navigateur marche en `http://localhost`. Sur un vrai téléphone via internet il faut du **HTTPS** (le cloud ci-dessous le donne gratuitement).

## Déployer gratuit (Render)

1. Mets ce dossier sur GitHub (`git init`, commit, push).
2. Va sur https://render.com → **New** → **Web Service** → choisis ton repo.
3. Réglages :
   - Build Command : `npm install`
   - Start Command : `npm start`
   - Environment → ajoute variable `SHARE_SECRET` = ta clé secrète (mets un truc long et privé).
4. Deploy. Render donne une URL HTTPS, ex : `https://ton-app.onrender.com`.

Ensuite :
- Toi  : `https://ton-app.onrender.com/me.html?key=TA_CLE`
- Elle : `https://ton-app.onrender.com/her.html?key=TA_CLE`

## Comment ça marche au quotidien

- Toi : ouvre la page `me`, appuie **Activer le partage**, autorise la localisation, épingle l'onglet (laisse-le ouvert). Ta position se met à jour seule.
- Elle : ouvre la page `her` quand elle veut → carte avec ta dernière position, rafraîchie toutes les 10 s.

## Limites (à savoir)

- Une page web **ne peut pas** lire le GPS en arrière-plan tout le temps : ta page `me` doit rester ouverte. Si tu fermes tout, sa carte montre la dernière position connue (avec l'heure).
- Pour un vrai suivi en fond, il faut une app native Android — dis-le moi si tu veux.
- Plan gratuit Render : le serveur s'endort après inactivité, premier chargement peut prendre ~30 s.
