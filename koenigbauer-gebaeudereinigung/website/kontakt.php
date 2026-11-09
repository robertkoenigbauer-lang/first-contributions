<?php
// Kontaktformular-Versand ohne externe Dienste (DSGVO-freundlich). Läuft auf jedem Standard-Webhosting mit PHP.
$empfaenger = 'info@koenigbauer-gebaeudereinigung.de';
$absender   = 'website@koenigbauer-gebaeudereinigung.de'; // Adresse auf der eigenen Domain anlegen

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Location: index.html'); exit; }
if (!empty($_POST['website'])) { header('Location: danke.html'); exit; } // Spam-Falle

function feld($n) { return trim(str_replace(["\r", "\n"], ' ', strip_tags($_POST[$n] ?? ''))); }
$name  = feld('name');
$email = filter_var(feld('email'), FILTER_VALIDATE_EMAIL);
if (!$name || !$email || ($_POST['datenschutz'] ?? '') !== 'ja') {
  http_response_code(400); exit('Bitte Name, gültige E-Mail und Datenschutz-Bestätigung angeben. <a href="index.html#kontakt">Zurück</a>');
}
$text = "Neue Anfrage über die Website\n\n"
  . "Name: $name\nFirma: " . feld('firma') . "\nE-Mail: $email\nTelefon: " . feld('telefon')
  . "\nObjektart: " . feld('objektart') . "\nOrt: " . feld('ort')
  . "\nE-Mail-Infos erwünscht (Einwilligung): " . (($_POST['info_einwilligung'] ?? '') === 'ja' ? 'JA – ' . date('d.m.Y H:i') : 'nein')
  . "\n\nNachricht:\n" . trim(strip_tags($_POST['nachricht'] ?? ''));
$kopf = "From: Website Königbauer <$absender>\r\nReply-To: $email\r\nContent-Type: text/plain; charset=UTF-8";
mail($empfaenger, '=?UTF-8?B?' . base64_encode("Anfrage: $name") . '?=', $text, $kopf);
header('Location: danke.html');
