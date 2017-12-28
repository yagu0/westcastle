## Pr&eacute;requis

php (assez r&eacute;cent)

## Ajustement du fichier de donn&eacute;es

 1. Renommer joueurs.csv.dist en joueurs.csv
 2. &eacute;diter joueurs.csv (ajout de joueurs, &eacute;dition, suppression...). Format en lignes : pr&eacute;nom,nom[,score,pdt,pr&eacute;sent]

pdt = "points de table". score,pdt,pr&eacute;sent : optionnels (d&eacute;faut 0, 0, 1)

## Lancement de l'aplication

 - [Linux] Double click sur "westcastle.sh", ou lancement depuis un terminal
 - [Windows,MacOS] `php -S localhost:8000` puis naviguer vers index.html

## Utilisation

 1. Cliquer sur les joueurs absents dans l'onglet "joueurs"
 2. Aller dans la section "appariements" et cliquer sur le bouton en haut
 3. &Agrave; la fin d'une ronde, cliquer sur chaque table pour indiquer les points. Pour lancer la ronde suivante, revenir en 1)

Le classement est mis &agrave; jour dans la rubrique correspondante et dans joueurs.csv
