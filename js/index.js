new Vue({
	el: "#mahjong",
	data: {
		players: [], //array of objects, filled later
		display: "players",
	},
	components: {
		'my-players': {
			props: ['players'],
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
					this.$forceUpdate(); //TODO (Vue.set... ?!)
				},
			},
		},
		'my-pairings': {
			props: ['players','writeScoreToDb'],
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
						<button id="runPairing" class="block btn" @click="doPairings()">Nouvelle ronde</button>
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
								<td><input type="text" v-model="sessions[currentIndex][i]"/></td>
							</tr>
						</table>
						<div class="button-container-horizontal">
							<button class="btn validate" @click="setScore()">Enregistrer</button>
							<button class="btn" @click="currentIndex = -1">Fermer</button>
						</div>
						<div v-if="scored[currentIndex]" class="warning">
							Attention: un score a déjà été enregistré.
							Les points indiqués ici s'ajouteront : il faut d'abord
							<span class="link" @click="clickRestore()">restaurer l'état précédent.</span>
							Si c'est déjà fait, ignorer ce message :)
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
				setScore: function() {
					let sortedSessions = this.sessions[this.currentIndex]
						.map( (s,i) => { return {value:s, index:i}; })
						.sort( (a,b) => { return parseInt(b.value) - parseInt(a.value); });
					let pdts = [4, 2, 1, 0];
					// NOTE: take care of ex-aequos (spread points subtotal)
					let curSum = 0, curCount = 0, start = 0;
					for (let i=0; i<4; i++)
					{
						// Update pdts:
						curSum += pdts[i];
						curCount++;
						if (i==3 || sortedSessions[i].value > sortedSessions[i+1].value)
						{
							let pdt = curSum / curCount;
							for (let j=start; j<=i; j++)
								this.players[this.tables[this.currentIndex][sortedSessions[j].index]].pdt += pdt;
							curSum = 0;
							curCount = 0;
							start = i+1;
						}
						// Update sessions:
						this.players[this.tables[this.currentIndex][i]].session += parseInt(this.sessions[this.currentIndex][i]);
					}
					this.scored[this.currentIndex] = true;
					this.currentIndex = -1;
					this.writeScoreToDb();
				},
				clickRestore: function() {
					document.getElementById('restoreBtn').click();
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
				<div id="timer" :style="{lineHeight: textHeight + 'px', fontSize: 0.66*textHeight + 'px'}">
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
				textHeight: function() {
					return screen.height;
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
			props: ['players','sortByScore','writeScoreToDb'],
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
						<button class="btn cancel" @click="resetPlayers()">Réinitialiser</button>
						<button id="restoreBtn" class="btn" @click="restoreLast()">Restaurer</button>
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
					this.players
						.slice(1) //discard Toto
						.forEach( p => {
							p.pdt = 0;
							p.session = 0;
							p.available = 1;
						});
					this.writeScoreToDb();
					document.getElementById("runPairing").click();
				},
				restoreLast: function() {
					let xhr = new XMLHttpRequest();
					let self = this;
					xhr.onreadystatechange = function() {
						if (this.readyState == 4 && this.status == 200)
						{
							let players = JSON.parse(xhr.responseText);
							if (players.length > 0)
							{
								players.unshift({ //add ghost 4th player for 3-players tables
									prenom: "Toto",
									nom: "",
									pdt: 0,
									session: 0,
									available: 0,
								});
								// NOTE: Vue warning "do not mutate property" if direct self.players = players
								for (let i=1; i<players.length; i++)
								{
									players[i].pdt = parseFloat(players[i].pdt);
									players[i].session = parseInt(players[i].session);
									Vue.set(self.players, i, players[i]);
								}
							}
						}
					};
					xhr.open("GET", "scripts/rw_players.php?restore=1", true);
					xhr.send(null);
				},
			},
		},
	},
	created: function() {
		let xhr = new XMLHttpRequest();
		let self = this;
		xhr.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200)
			{
				let players = JSON.parse(xhr.responseText);
				players.forEach( p => {
					p.pdt = !!p.pdt ? parseFloat(p.pdt) : 0;
					p.session = !!p.session ? parseInt(p.session) : 0;
					p.available = !!p.available ? p.available : 1; //use integer for fputcsv PHP func
				});
				players.unshift({ //add ghost 4th player for 3-players tables
					prenom: "Toto",
					nom: "",
					pdt: 0,
					session: 0,
					available: 0,
				});
				self.players = players;
			}
		};
		xhr.open("GET", "scripts/rw_players.php", true);
		xhr.send(null);
	},
	methods: {
		// Used both in ranking and pairings:
		sortByScore: function(a,b) {
			return b.pdt - a.pdt + (Math.atan(b.session - a.session) / (Math.PI/2)) / 2;
		},
		writeScoreToDb: function() {
			let xhr = new XMLHttpRequest();
			xhr.open("POST", "scripts/rw_players.php");
			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			let orderedPlayers = this.players
				.slice(1) //discard Toto
				.sort(this.sortByScore);
			xhr.send("players="+encodeURIComponent(JSON.stringify(orderedPlayers)));
		},
	},
});
