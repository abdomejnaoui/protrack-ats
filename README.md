# ProTrack ATS — version web

Ce dossier transforme le fichier React/TSX fourni en un projet web prêt à lancer et à publier.

## Publier le site sans écrire de code (Vercel)

1. Décompressez `protrack-ats-site.zip` sur votre ordinateur.
2. Créez un compte sur https://vercel.com/ si vous n'en avez pas.
3. Dans Vercel, choisissez **Add New → Project**.
4. Importez le dossier du projet depuis un dépôt GitHub. Si vous n'utilisez pas GitHub, vous pouvez d'abord créer un dépôt privé/public sur https://github.com/ et y téléverser tous les fichiers de ce dossier.
5. Vercel détecte normalement Vite automatiquement. Vérifiez :
   - Framework Preset : **Vite**
   - Build Command : `npm run build`
   - Output Directory : `dist`
6. Cliquez sur **Deploy**. Vercel donnera une adresse publique en `vercel.app`.
7. Envoyez cette adresse aux personnes qui doivent ouvrir ProTrack ATS dans leur navigateur.

## Lancer le projet sur un ordinateur

Installez Node.js (version LTS), ouvrez un terminal dans ce dossier puis lancez :

```bash
npm install
npm run dev
```

Pour vérifier la version de publication :

```bash
npm run build
```

## Important — données et comptes

Cette version reprend le fonctionnement du fichier fourni. Les données sont stockées dans le `localStorage` du navigateur. Cela signifie :

- tout le monde peut ouvrir le même site avec le lien public ;
- les données créées par une personne ne sont **pas automatiquement visibles** chez les autres personnes ou sur leurs appareils ;
- les données de démonstration et les identifiants intégrés au code ne constituent pas une sécurité de production.

Pour que plusieurs utilisateurs partagent les mêmes offres, CV, candidatures, entretiens et décisions, il faudra connecter une base de données en ligne et une authentification (par exemple Supabase), puis adapter les opérations de lecture/écriture de l'application. Cette étape n'est pas incluse dans cette première version publiée.

L'analyse des CV du fichier d'origine est une simulation locale et ne doit pas être présentée comme une véritable IA de recrutement.
