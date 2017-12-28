<?php

if (!isset($_POST["players"]))
{
	// Retrieve all players
	$handle = fopen("../joueurs.csv", "r");
	$players = [];
	$row = 0;
	$data = fgetcsv($handle); //skip header
	while (($data = fgetcsv($handle)) !== FALSE)
	{
		$players[$row] = array(
			"prenom" => $data[0],
			"nom" => $data[1],
			"pdt" => count($data)>=3 ? $data[2] : 0,
			"session" => count($data)>=4 ? $data[3] : 0,
			"available" => count($data)>=5 ? $data[4] : 1,
		);
		$row++;
	}
	fclose($handle);
	echo json_encode($players);
}
else
{
	// Write header + all players
	$handle = fopen("../joueurs.csv", "w");
	fputcsv($handle, ["prenom","nom","pdt","session","present"]);
	$players = json_decode($_POST["players"]);
	foreach ($players as $p)
		fputcsv($handle, (array)$p);
	fclose($handle);
}

?>
