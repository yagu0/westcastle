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
					<div id="active">
						<p>Présents</p>
						<table class="list">
							<tr v-for="p in sortedPlayers" v-if="p.available" @click="toggleAvailability(p.index)">
								<td>{{ p.prenom }}</td>
								<td>{{ p.nom }}</td>
							</tr>
						</table>
					</div>
					<div id="inactive">
						<p>Absents</p>
						<table class="list">
							<tr v-for="p in sortedPlayers" v-if="!p.available" @click="toggleAvailability(p.index)">
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
		'my-ranking': {
			props: ['players'],
			data: function() {
				return {
					sortMethod: "score",
				};
			},
			template: `
				<div id="ranking">
					<table class="ranking">
						<tr class="title">
							<th>Rang</th>
							<th>Joueur</th>
							<th @click="sortMethod='score'" class="scoring" :class="{active: sortMethod=='score'}">Score</th>
							<th @click="sortMethod='pdt'" class="scoring" :class="{active: sortMethod=='pdt'}">PdT</th>
						</tr>
						<tr v-for="(p,i) in sortedPlayers">
							<td>{{ i+1 }}</td>
							<td>{{ p.prenom }} {{ p.nom }}</td>
							<td>{{ p.score }}</td>
							<td>{{ p.pdt }}</td>
						</tr>
					</table>
				</div>
			`,
			computed: {
				sortedPlayers: function() {
					let sortFunc = this.sortMethod == "score"
						? this.sortByScore
						: this.sortByPdt;
					return this.players
						.map( p => { return p; }) //to not alter original array
						.sort(sortFunc);
				},
			},
			methods: {
				sortByScore: function(a,b) {
					return b.score - a.score;
				},
				sortByPdt: function(a,b) {
					return b.pdt - a.pdt;
				},
			},
		},
		'my-pairings': {
			props: ['players'],
			data: function() {
				return {
					unpaired: [],
					tables: [], //array of arrays of players indices
					scores: [], //scores for each table (3 or 4 players)
					pdts: [], //"points de table" for each table (3 or 4 players)
					currentIndex: -1, //table index for scoring
				};
			},
			template: `
				<div id="pairings">
					<div v-show="currentIndex < 0">
						<button class="block btn" @click="shuffle()">Appariement</button>
						<div class="pairing" v-for="(table,index) in tables" :class="{scored: scores[index].length > 0}"
								@click="showScoreForm(table,index)">
							<p>Table {{ index+1 }}</p>
							<table>
								<tr v-for="(i,j) in table">
									<td>{{ players[i].prenom }} {{ players[i].nom }}</td>
									<td class="score"><span v-show="pdts[index].length > 0">{{ pdts[index][j] }}</span></td>
								</tr>
								<tr v-if="table.length < 4">
									<td>&nbsp;</td>
									<td>&nbsp;</td>
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
								<td>{{ players[tables[currentIndex][i]].prenom }} {{ players[tables[currentIndex][i]].nom }}</td>
								<td><input type="text" v-model="pdts[currentIndex][i]" value="0"/></td>
							</tr>
						</table>
						<div class="button-container">
							<button class="btn" @click="setScore()">Enregistrer</button>
							<button class="btn cancel" @click="resetScore()">Annuler</button>
						</div>
					</div>
				</div>
			`,
			methods: {
				doPairings: function() {
					// Simple case first: 4 by 4
					let tables = [];
					let currentTable = [];
					let ordering = _.shuffle(_.range(this.players.length)); //TODO: take scores into account?
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
					this.tables = tables;
					this.scores = tables.map( t => { return []; }); //empty scores
					this.pdts = tables.map( t => { return []; }); //empty pdts
				},
				shuffle: function() {
					this.doPairings();
				},
				showScoreForm: function(table,index) {
					if (this.scores[index].length > 0)
						return; //already scored
					this.scores[index] = _.times(table.length, _.constant(0));
					this.pdts[index] = _.times(table.length, _.constant(0));
					this.currentIndex = index;
				},
				setScore: function() {
					let sortedPdts = this.pdts[this.currentIndex]
						.map( (s,i) => { return {value:s, index:i}; })
						.sort( (a,b) => { return parseInt(b.value) - parseInt(a.value); });
					let scores = [4, 2, 1, 0]; //TODO: biased for 3-players tables. TODO: ex-aequos ?!
					for (let i=0; i<this.tables[this.currentIndex].length; i++)
					{
						this.players[this.tables[this.currentIndex][sortedPdts[i].index]].score += scores[i];
						this.players[this.tables[this.currentIndex][i]].pdt += parseInt(this.pdts[this.currentIndex][i]);
					}
					this.currentIndex = -1;
					this.writeScoreToDb();
				},
				resetScore: function() {
					this.scores[this.currentIndex] = [];
					this.pdts[this.currentIndex] = [];
					this.currentIndex = -1;
				},
				writeScoreToDb: function()
				{
					let xhr = new XMLHttpRequest();
					xhr.open("POST", "scripts/rw_players.php");
					xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
					let orderedPlayers = this.players
						.map( p => { return Object.assign({}, p); }) //deep (enough) copy
						.sort( (a,b) => { return b.score - a.score; });
					xhr.send("players="+encodeURIComponent(JSON.stringify(orderedPlayers)));
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
					p.score = !!p.score ? parseInt(p.score) : 0;
					p.pdt = !!p.pdt ? parseInt(p.pdt) : 0;
					p.available = !!p.available ? p.available : 1; //use integer for fputcsv PHP func
				});
				self.players = players;
			}
		};
		xhr.open("GET", "scripts/rw_players.php", true);
		xhr.send(null);
	},
});
