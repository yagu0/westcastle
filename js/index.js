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
							<button class="btn cancel" :class="{hide: tables.length==0}" @click="cancelRound()" title="Annule la ronde courante : tous les scores en cours seront perdus, et un nouveau tirage effectué. ATTENTION : action irréversible">
								Annuler
							</button>
							<button id="doPairings" class="btn" :disabled="scored.some( s => { return !s; })" @click="doPairings()" title="Répartit les joueurs actifs aléatoirement sur les tables">
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
							<button :class="{hide:scored[currentIndex]}" class="btn validate" @click="setScore()" title="Enregistre le score dans la base">
								Enregistrer
							</button>
							<button :class="{hide:!scored[currentIndex]}" class="btn cancel" @click="cancelScore()" title="Annule le score précédemment enregistré">
								Annuler
							</button>
							<button class="btn" @click="closeScoreForm()">Fermer</button>
						</div>
					</div>
				</div>
			`,
			methods: {
				// TODO: télécharger la ronde courante (faudrait aussi mémoriser les points...)
				// --> je devrais séparer les components en plusieurs fichiers maintenant
				cancelRound: function() {
					this.scored.forEach( (s,i) => {
						if (s)
						{
							// Cancel this table
							this.currentIndex = i; //TODO: clumsy. functions should take "index" as argument
							this.cancelScore();
						}
					});
					this.currentIndex = -1;
					this.doPairings();
				},
				doPairings: function() {
					let rounds = JSON.parse(localStorage.getItem("rounds")) || [];
					if (this.scored.some( s => { return s; }))
					{
						this.commitScores(); //TODO: temporary: shouldn't be here... (incremental commit)
						rounds.push(this.tables);
						localStorage.setItem("rounds", JSON.stringify(rounds));
					}
					this.currentIndex = -1; //required if reset while scoring
					let tables = [];
					// 1) Pre-compute tables repartition (in numbers): depends on active players count % 4
					let activePlayers = this.players
						.map( (p,i) => { return Object.assign({}, p, {index:i}); })
						.filter( p => { return p.available; });
					let repartition = _.times(Math.floor(activePlayers.length/4), _.constant(4));
					let remainder = activePlayers.length % 4;
					if (remainder > 0)
						repartition.push(remainder);
					switch (remainder)
					{
						case 1:
							// Need 2 more
							if (repartition.length-1 >= 2)
							{
								repartition[repartition.length-3] --  ;
								repartition[repartition.length-2] --  ;
								repartition[repartition.length-1] += 2;
							}
							break;
						case 2:
							// Need 1 more
							if (repartition.length-1 >= 1)
							{
								repartition[repartition.length-2] --  ;
								repartition[repartition.length-1] ++  ;
							}
							break;
					}
					// 2) Shortcut for round 1: just spread at random
					if (rounds.length == 0)
					{
						let currentTable = [];
						let ordering = _.shuffle(_.range(activePlayers.length));
						let tableIndex = 0;
						ordering.forEach( i => {
							currentTable.push(activePlayers[i].index);
							if (currentTable.length == repartition[tableIndex])
							{
								if (currentTable.length == 3)
									currentTable.push(0); //add Toto
								// flush
								tables.push(currentTable);
								currentTable = [];
								tableIndex++;
							}
						});
					}
					else
					{
						// General case after round 1:
						// NOTE: alternative method, deterministic: player 1 never move, player 2 moves by 1, ...and so on
						// --> but this leads to inferior pairings (e.g. 2 tables 8 players)
						// -----
						// 2bis) Compute the "meeting" matrix: who played who and how many times
						let meetMat = _.range(this.players.length).map( i => {
							return _.times(this.players.length, _.constant(0));
						});
						rounds.forEach( r => { //for each round
							r.forEach( t => { //for each table within round
								for (let i=0; i<4; i++) //TODO: these loops are ugly
								{
									for (let j=i+1; j<4; j++)
										meetMat[t[i]][t[j]]++;
								}
							});
						});
						// 3) Fill tables by minimizing row sums of meetMat
						const playersCount = activePlayers.length;
						repartition.forEach( r => {
							// Pick first player at random among active players, unless there is one unpaired guy
							let firstPlayer = this.unpaired[0]; //can be undefined
							if (!firstPlayer || activePlayers.length < playersCount)
							{
								let randIndex = _.sample( _.range(activePlayers.length) );
								firstPlayer = activePlayers[randIndex].index;
								activePlayers.splice(randIndex, 1);
							}
							else
								activePlayers.splice( activePlayers.findIndex( item => { return item.index == firstPlayer; }), 1 );
							let table = [ firstPlayer ];
							for (let i=1; i<r; i++)
							{
								// Minimize row sums of meetMat for remaining players
								let counts = [];
								activePlayers.forEach( u => {
									let count = 0;
									let candidate = u.index;
									table.forEach( p => {
										count += meetMat[p][candidate];
										count += meetMat[candidate][p];
									});
									counts.push( {index:u.index, count:count } );
								});
								counts.sort( (a,b) => { return a.count - b.count; });
								table.push(counts[0].index);
								activePlayers.splice( activePlayers.findIndex( item => { return item.index == counts[0].index; }), 1 );
							}
							if (table.length == 3)
								table.push(0); //add Todo
							tables.push(table);
						});
					}
					if (tables.length >= 1 && tables[tables.length-1].length < 3)
						this.unpaired = tables.pop();
					else
						this.unpaired = [];
					this.tables = tables;
					this.resetScores();
				},
				resetScores: function() {
					this.sessions = this.tables.map( t => { return []; }); //empty sessions
					this.scored = this.tables.map( t => { return false; }); //nothing scored yet
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
				cancelScore: function() {
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
					initialTime: 90, //1h30, in minutes
					setter: false,
					setterTime: 0, //to input new initial time
				};
			},
			template: `
				<div id="timer" :style="{lineHeight: divHeight + 'px', fontSize: 0.66*divHeight + 'px', width: divWidth + 'px', height: divHeight + 'px'}">
					<div v-show="!setter" @click.left="pauseResume()" @click.right.prevent="reset()" :class="{timeout:time==0}">
						{{ formattedTime }}
					</div>
					<input type="text" autofocus id="setter" @keyup.enter="setTime()" @keyup.esc="setter=false" v-show="setter" v-model="setterTime"></input>
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
				setTime: function() {
					this.initialTime = this.setterTime;
					this.setter = false;
					this.reset();
				},
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
					this.time = this.initialTime * 60;
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
					if (this.time == this.initialTime * 60)
						new Audio("sounds/gong.mp3").play(); //gong at the beginning
					setTimeout(() => {
						if (this.running)
							this.time--;
						this.start();
					}, 1000);
				},
			},
			created: function() {
				this.setterTime = this.initialTime;
				this.reset();
			},
			mounted: function() {
				let timer = document.getElementById("timer");
				let keyDict = {
					32: () => { this.setter = true; }, //Space
					27: () => { this.setter = false; }, //Esc
				};
				document.addEventListener("keyup", e => {
					if (timer.style.display !== "none")
					{
						let func = keyDict[e.keyCode];
						if (!!func)
						{
							e.preventDefault();
							func();
						}
					}
				});
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
