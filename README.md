## Pr&eacute;requis

php >= 5.4

## Ajustement du fichier de donn&eacute;es

 1. Renommer joueurs.csv.dist en joueurs.csv
 2. &eacute;diter joueurs.csv en s'inspirant de joueurs.sample.csv. Format en lignes : pr&eacute;nom,nom[,pdt,session,pr&eacute;sent]

pdt, session, pr&eacute;sent : optionnels (par d&eacute;faut resp. 0, 0, 1).

pdt = "points de table" ; session = "mini-points"

## Lancement de l'aplication

 - [Linux] Double click sur "westcastle.sh", ou lancement depuis un terminal
 - [Windows,MacOS] `php -S localhost:8000` puis aller &agrave; http://localhost:8000 dans un navigateur web

## Utilisation

Naviguer vers http://localhost:8000/doc
