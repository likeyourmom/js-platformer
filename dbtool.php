<?php
	$db_host = "localhost"; 
	$db_user = "root"; // Логин БД
	$db_password = "root"; // Пароль БД
	$db_name = "myshop_database"; // БД
	$db_table = "game_records"; // Имя Таблицы БД
	
	$db = new mysqli($db_host, $db_user , $db_password, $db_name) OR DIE("Connection failed...");

	if($_SERVER['REQUEST_METHOD'] === 'POST'){ //POST
		$date = strval(date("Y-m-d H:i:s"));
		$nickname = $_POST['nick'];
		$score = $_POST['score'];
		$time = $_POST['time'];

		$query = "INSERT INTO ".$db_table."(date,nickname,score,time) VALUES ('".$date."','".$nickname."','".$score."','".$time."')";

		$result = $db->query($query);
		if($result){
			echo("Success!");
		}else{
			echo("Fail: " . $query);
		}
	}else{ //GET
		 $response = "";
		
		 $sql = "SELECT * FROM " . $db_table . " ORDER BY time ASC";
		 $result = $db->query($sql);
		 
		 while ($row = $result->fetch_assoc()){
		   $response .= "<tr><td>" . $row['date'] . "</td>" . "<td>" . $row['nickname'] . "</td>" . "<td>" . $row['score'] . "</td>" . "<td>" . $row['time'] . "</td></tr>";
		 }
		 
		 echo($response);
	}
	
	$db->close();
?>