## Pr&eacute;requis

php >= 5.4

## Ajustement du fichier de donn&eacute;es

 1. Renommer joueurs.csv.dist en joueurs.csv
 2. &eacute;diter joueurs.csv en s'inspirant de joueurs.sample.csv. Format en lignes : pr&eacute;nom,nom[,pdt,session,pr&eacute;sent]

pdt, session, pr&eacute;sent : optionnels (par d&eacute;faut resp. 0, 0, 1).

pdt = "points de table" ; session = "mini-points"

## Lancement de l'aplication

 - [Linux] Double click sur "westcastle.sh", ou lancement depuis un terminal
 - [Windows,MacOS] `php -S localhost:8000` puis naviguer vers index.html

## Utilisation

 1. Cliquer sur les joueurs absents dans l'onglet "joueurs"
 2. Aller dans la section "appariements" et cliquer sur le bouton en haut
 3. Lancer le chrono (section "chronom&egrave;tre", puis click gauche, puis passer en plein &eacute;cran [F11])
 4. &Agrave; la fin d'une ronde, cliquer sur chaque table pour indiquer les (mini-)points.

Le classement est mis &agrave; jour dans la rubrique correspondante et dans joueurs.csv. Il peut &ecirc;tre r&eacute;initialis&eacute; (bouton en haut).

Apr&egrave;s chaque op&eacute;ration sur les points, en cas d'erreur le bouton "Restaurer" en haut &agrave; droite annule la derni&egrave;re op&eacute;ration.

-----

Pour plus de d&eacute;tails, naviguer vers localhost:8000/doc
