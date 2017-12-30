new Vue({
	el: "#mahjong",
	data: {
		players: [], //array of objects, filled later
		display: "players",
	},
	components: {
		'my-players': {
			props: ['players','initPlayers'],
			template: `
				<div id="players">
					<div class="left">
						<p>Présents</p>
						<table class="list">
							<tr v-for="p in sortedPlayers" v-if="p.available" @click="toggleAvailability(p.index)">
								<td>{{ p.prenom }}</td>
								<td>{{ p.nom }}</td>
							</tr>
						</table>
					</div>
					<div id="inactive" class="right">
						<p>Absents</p>
						<table class="list">
							<tr v-for="p in sortedPlayers" v-if="!p.available && p.nom!=''" @click="toggleAvailability(p.index)">
								<td>{{ p.prenom }}</td>
								<td>{{ p.nom }}</td>
							</tr>
						</table>
					</div>
					<div class="clear">
						<input class="hide" id="upload" type="file" @change="upload"/>
						<button class="btn block cancel" @click="uploadTrigger()" title="Charge la liste des joueurs, en principe en début de tournoi">
							(Ré)initialiser
						</button>
					</div>
				</div>
			`,
			computed: {
				sortedPlayers: function() {
					return this.players
						.map( (p,i) => { return Object.assign({}, p, {index: i}); })
						.sort( (a,b) => {
							return a.nom.localeCompare(b.nom);
						});
				},
			},
			methods: {
				toggleAvailability: function(i) {
					this.players[i].available = 1 - this.players[i].available;
				},
				uploadTrigger: function() {
					document.getElementById("upload").click();
				},
				upload: function(e) {
					let file = (e.target.files || e.dataTransfer.files)[0];
					var reader = new FileReader();
					reader.onloadend = ev => {
						this.initPlayers(ev.currentTarget.result);
					};
					reader.readAsText(file);
				},
			},
		},
		'my-pairings': {
			props: ['players','commitScores'],
			data: function() {
				return {
					unpaired: [],
					tables: [], //array of arrays of players indices
					sessions: [], //"mini-points" for each table
					currentIndex: -1, //table index for scoring
					scored: [], //boolean for each table index
				};
			},
			template: `
				<div id="pairings">
					<div v-show="currentIndex < 0">
						<div class="button-container-horizontal">
							<button class="btn validate" :class="{hide: tables.length==0}" @click="commitScores()" title="Valide l'état actuel des scores (cf. rubrique Classement) en mémoire. Cette action est nécessaire au moins une fois en fin de tournoi après toutes les parties, et est recommandée après chaque ronde">
								Valider
							</button>
							<button id="doPairings" class="btn" :class="{cancel: tables.length>0}" @click="doPairings()" title="Répartit les joueurs actifs aléatoirement sur les tables">
								Nouvelle ronde
							</button>
						</div>
						<div class="pairing" v-for="(table,index) in tables" :class="{scored: scored[index]}"
								@click="showScoreForm(table,index)">
							<p>Table {{ index+1 }}</p>
							<table>
								<tr v-for="(i,j) in table">
									<td :class="{toto: players[i].prenom=='Toto'}">{{ players[i].prenom }} {{ players[i].nom }}</td>
									<td class="score"><span v-show="sessions[index].length > 0">{{ sessions[index][j] }}</span></td>
								</tr>
							</table>
						</div>
						<div v-if="unpaired.length>0" class="pairing unpaired">
							<p>Exempts</p>
							<div v-for="i in unpaired">
								{{ players[i].prenom }} {{ players[i].nom }}
							</div>
						</div>
					</div>
					<div id="scoreInput" v-if="currentIndex >= 0">
						<table>
							<tr v-for="(index,i) in tables[currentIndex]">
								<td :class="{toto: players[tables[currentIndex][i]].prenom=='Toto'}">
									{{ players[tables[currentIndex][i]].prenom }} {{ players[tables[currentIndex][i]].nom }}
								</td>
								<td><input type="text" v-model="sessions[currentIndex][i]" :disabled="scored[currentIndex]"/></td>
							</tr>
						</table>
						<div class="button-container-horizontal">
							<button :class="{hide:scored[currentIndex]}" class="btn validate" @click="setScore()" title="Enregistre le score dans la base (la rubrique Classement est mise à jour)">
								Enregistrer
							</button>
							<button :class="{hide:!scored[currentIndex]}" class="btn cancel" @click="resetScore()" title="Annule le score précédemment enregistré : l'action est visible dans la rubrique Classement">
								Annuler
							</button>
							<button class="btn" @click="closeScoreForm()">Fermer</button>
						</div>
					</div>
				</div>
			`,
			methods: {
				doPairings: function() {
					// Simple case first: 4 by 4
					let tables = [];
					let currentTable = [];
					let ordering = _.shuffle(_.range(this.players.length));
					for (let i=0; i<ordering.length; i++)
					{
						if ( ! this.players[ordering[i]].available )
							continue;
						if (currentTable.length >= 4)
						{
							tables.push(currentTable);
							currentTable = [];
						}
						currentTable.push(ordering[i]);
					}
					// Analyse remainder
					this.unpaired = [];
					if (currentTable.length != 0)
					{
						if (currentTable.length < 3)
						{
							let missingPlayers = 3 - currentTable.length;
							// Pick players from 'missingPlayers' random different tables, if possible
							if (tables.length >= missingPlayers)
							{
								let tblNums = _.sample(_.range(tables.length), missingPlayers);
								tblNums.forEach( num => {
									currentTable.push(tables[num].pop());
								});
							}
						}
						if (currentTable.length >= 3)
							tables.push(currentTable);
						else
							this.unpaired = currentTable;
					}
					// Ensure that all tables have 4 players
					tables.forEach( t => {
						if (t.length < 4)
							t.push(0); //index of "Toto", ghost player
					});
					this.tables = tables;
					this.sessions = tables.map( t => { return []; }); //empty sessions
					this.scored = tables.map( t => { return false; }); //nothing scored yet
					this.currentIndex = -1; //required if reset while scoring
				},
				showScoreForm: function(table,index) {
					if (this.sessions[index].length == 0)
						this.sessions[index] = _.times(table.length, _.constant(0));
					this.currentIndex = index;
				},
				closeScoreForm: function() {
					if (!this.scored[this.currentIndex])
						this.sessions[this.currentIndex] = [];
					this.currentIndex = -1;
				},
				getPdts: function() {
					let sortedSessions = this.sessions[this.currentIndex]
						.map( (s,i) => { return {value:parseInt(s), index:i}; })
						.sort( (a,b) => { return b.value - a.value; });
					const ref_pdts = [4, 2, 1, 0];
					// NOTE: take care of ex-aequos (spread points subtotal)
					let curSum = 0, curCount = 0, start = 0;
					let sortedPdts = [];
					for (let i=0; i<4; i++)
					{
						curSum += ref_pdts[i];
						curCount++;
						if (i==3 || sortedSessions[i].value > sortedSessions[i+1].value)
						{
							let pdt = curSum / curCount;
							for (let j=start; j<=i; j++)
								sortedPdts.push(pdt);
							curSum = 0;
							curCount = 0;
							start = i+1;
						}
					}
					// Re-order pdts to match table order
					let pdts = [0, 0, 0, 0];
					for (let i=0; i<4; i++)
						pdts[sortedSessions[i].index] = sortedPdts[i];
					return pdts;
				},
				setScore: function() {
					let pdts = this.getPdts();
					for (let i=0; i<4; i++)
					{
						this.players[this.tables[this.currentIndex][i]].pdt += pdts[i];
						this.players[this.tables[this.currentIndex][i]].session += parseInt(this.sessions[this.currentIndex][i]);
					}
					Vue.set(this.scored, this.currentIndex, true);
					this.currentIndex = -1;
				},
				resetScore: function() {
					let pdts = this.getPdts();
					for (let i=0; i<4; i++)
					{
						this.players[this.tables[this.currentIndex][i]].pdt -= pdts[i];
						this.players[this.tables[this.currentIndex][i]].session -= parseInt(this.sessions[this.currentIndex][i]);
					}
					Vue.set(this.scored, this.currentIndex, false);
				},
			},
		},
		'my-timer': {
			data: function() {
				return {
					time: 0, //remaining time, in seconds
					running: false,
				};
			},
			template: `
				<div id="timer" :style="{lineHeight: divHeight + 'px', fontSize: 0.66*divHeight + 'px', width: divWidth + 'px', height: divHeight + 'px'}">
					<div @click.left="pauseResume()" @click.right.prevent="reset()" :class="{timeout:time==0}">
						{{ formattedTime }}
					</div>
					<img class="close-cross" src="img/cross.svg" @click="$emit('clockover')"/>
				</div>
			`,
			computed: {
				formattedTime: function() {
					let seconds = this.time % 60;
					let minutes = Math.floor(this.time / 60);
					return this.padToZero(minutes) + ":" + this.padToZero(seconds);
				},
				divHeight: function() {
					return screen.height;
				},
				divWidth: function() {
					return screen.width;
				},
			},
			methods: {
				padToZero: function(a) {
					if (a < 10)
						return "0" + a;
					return a;
				},
				pauseResume: function() {
					this.running = !this.running;
					if (this.running)
						this.start();
				},
				reset: function(e) {
					this.running = false;
					this.time = 5400; //1:30
				},
				start: function() {
					if (!this.running)
						return;
					if (this.time == 0)
					{
						new Audio("sounds/gong.mp3").play();
						this.running = false;
						return;
					}
					setTimeout(() => {
						if (this.running)
							this.time--;
						this.start();
					}, 1000);
				},
			},
			created: function() {
				this.reset();
			},
		},
		'my-ranking': {
			props: ['players','sortByScore','commitScores'],
			template: `
				<div id="ranking">
					<table class="ranking">
						<tr class="title">
							<th>Rang</th>
							<th>Joueur</th>
							<th>Points</th>
							<th>Mini-pts</th>
						</tr>
						<tr v-for="p in sortedPlayers">
							<td>{{ p.rank }}</td>
							<td>{{ p.prenom }} {{ p.nom }}</td>
							<td>{{ p.pdt }}</td>
							<td>{{ p.session }}</td>
						</tr>
					</table>
					<div class="button-container-vertical" style="width:200px">
						<a id="download" href="#"></a>
						<button class="btn" @click="download()" title="Télécharge le classement courant au format CSV">Télécharger</button>
						<button class="btn cancel" @click="resetPlayers()" title="Réinitialise les scores à zéro. ATTENTION: action irréversible">
							Réinitialiser
						</button>
					</div>
				</div>
			`,
			computed: {
				sortedPlayers: function() {
					let res = this.rankPeople();
					// Add rank information (taking care of ex-aequos)
					let rank = 1;
					for (let i=0; i<res.length; i++)
					{
						if (i==0 || this.sortByScore(res[i],res[i-1]) == 0)
							res[i].rank = rank;
						else //strictly lower scoring
							res[i].rank = ++rank;
					}
					return res;
				},
			},
			methods: {
				rankPeople: function() {
					return this.players
						.slice(1) //discard Toto
						.sort(this.sortByScore);
				},
				resetPlayers: function() {
					if (confirm('Êtes-vous sûr ?'))
					{
						this.players
							.slice(1) //discard Toto
							.forEach( p => {
								p.pdt = 0;
								p.session = 0;
								p.available = 1;
							});
						this.commitScores();
						document.getElementById("doPairings").click();
					}
				},
				download: function() {
					// Prepare file content
					let content = "prénom,nom,pdt,session\n";
					this.players
						.slice(1) //discard Toto
						.sort(this.sortByScore)
						.forEach( p => {
							content += p.prenom + "," + p.nom + "," + p.pdt + "," + p.session + "\n";
						});
					// Prepare and trigger download link
					let downloadAnchor = document.getElementById("download");
					downloadAnchor.setAttribute("download", "classement.csv");
					downloadAnchor.href = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
					downloadAnchor.click();
				},
			},
		},
	},
	created: function() {
		let players = JSON.parse(localStorage.getItem("players"));
		if (players !== null)
		{
			this.addToto(players);
			this.players = players;
		}
	},
	methods: {
		addToto: function(array) {
			array.unshift({ //add ghost 4th player for 3-players tables
				prenom: "Toto",
				nom: "",
				pdt: 0,
				session: 0,
				available: 0,
			});
		},
		// Used both in ranking and pairings:
		sortByScore: function(a,b) {
			return b.pdt - a.pdt + (Math.atan(b.session - a.session) / (Math.PI/2)) / 2;
		},
		commitScores: function() {
			localStorage.setItem(
				"players",
				JSON.stringify(this.players.slice(1)) //discard Toto
			);
		},
		// Used in players, reinit players array
		initPlayers: function(csv) {
			const allLines = csv
				.split(/\r\n|\n|\r/) //line breaks
				.splice(1); //discard header
			let players = allLines
				.filter( line => { return line.length > 0; }) //remove empty lines
				.map( line => {
					let parts = line.split(",");
					let p = { prenom: parts[0], nom: parts[1] };
					p.pdt = parts.length > 2 ? parseFloat(parts[2]) : 0;
					p.session = parts.length > 3 ? parseInt(parts[3]) : 0;
					p.available = parts.length > 4 ? parts[4] : 1;
					return p;
				});
			this.addToto(players);
			this.players = players;
			this.commitScores(); //save players in memory
		},
	},
});
