<?php
// Check for empty fields
if(empty($_POST['name'])  		||
   empty($_POST['email']) 		||
   empty($_POST['phone']) 		||
   empty($_POST['message'])	||
   !filter_var($_POST['email'],FILTER_VALIDATE_EMAIL))
   {
	echo "No arguments Provided!";
	return false;
   }

$name = $_POST['name'];
$email_address = $_POST['email'];
$phone = $_POST['phone'];
$message = $_POST['message'];

// Create the email and send the message
$to = 'chaytaniguti@gmail.com'; // Add your email address inbetween the '' replacing yourname@yourdomain.com - This is where the form will send a message to.
$email_subject = "Contato - site RUTA:  $name";
$email_body = "Você recebeu uma nova mensagem do website da Coletiva RUTA.\n\n"."Aqui estão os detalhes:\n\nName: $name\n\nEmail: $email_address\n\nTelefone: $phone\n\nMensagem:\n$message";
$headers = "From: noreply@yourdomain.com\n"; // This is the email address the generated message will be from. We recommend using something like noreply@yourdomain.com.
$headers .= "Responda para: $email_address";
mail($to,$email_subject,$email_body,$headers);
return true;
?>